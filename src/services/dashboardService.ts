// src/services/dashboardService.ts
import { supabase } from '../lib/supabase';
import { OwnerDashboardData, TeacherDashboardData, ParentDashboardData } from '../contexts/DashboardContext';
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isAfter, isSameDay } from 'date-fns';

// ======================= OWNER DASHBOARD DATA =======================

export async function fetchOwnerDashboardData(studioId: string): Promise<OwnerDashboardData> {
  // Execute all data fetching in parallel for performance
  const [
    revenueData,
    invoiceData,
    studentData,
    classData,
    teacherData,
    activityData
  ] = await Promise.all([
    fetchOwnerRevenueData(studioId),
    fetchOwnerInvoiceData(studioId),
    fetchOwnerStudentData(studioId),
    fetchOwnerClassData(studioId),
    fetchOwnerTeacherData(studioId),
    fetchOwnerActivityData(studioId)
  ]);

  return {
    revenue: revenueData,
    invoices: invoiceData,
    students: studentData,
    classes: classData,
    teachers: teacherData,
    recentActivity: activityData
  };
}

async function fetchOwnerRevenueData(studioId: string) {
  // Get current month date range
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  
  // Get previous month date range
  const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
  const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
  
  // Query payments for current month (assuming a payments table exists)
  // Note: From the schema, we don't have a direct view of the payments table structure
  // so we'll need to adjust this query based on the actual schema
  
  // For now, let's query invoices with status='paid' and paid_at in the current month
  const { data: currentMonthInvoices, error: currentError } = await supabase
    .from('invoices')
    .select('total, paid_at')
    .eq('studio_id', studioId)
    .eq('status', 'paid')
    .gte('paid_at', currentMonthStart.toISOString())
    .lte('paid_at', currentMonthEnd.toISOString());
  
  if (currentError) throw currentError;
  
  // Query for previous month
  const { data: prevMonthInvoices, error: prevError } = await supabase
    .from('invoices')
    .select('total, paid_at')
    .eq('studio_id', studioId)
    .eq('status', 'paid')
    .gte('paid_at', prevMonthStart.toISOString())
    .lte('paid_at', prevMonthEnd.toISOString());
  
  if (prevError) throw prevError;
  
  // Calculate totals
  const currentMonthRevenue = currentMonthInvoices 
    ? currentMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) 
    : 0;
  
  const prevMonthRevenue = prevMonthInvoices 
    ? prevMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) 
    : 0;
  
  // Calculate percentage change
  let percentChange = 0;
  if (prevMonthRevenue > 0) {
    percentChange = Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
  } else if (currentMonthRevenue > 0) {
    percentChange = 100; // If previous month was 0, but current month has revenue
  }
  
  return {
    current: currentMonthRevenue,
    percentChange
  };
}

async function fetchOwnerInvoiceData(studioId: string) {
  // Get outstanding invoices (pending)
  const { data: pendingInvoices, error: pendingError } = await supabase
    .from('invoices')
    .select('id, total')
    .eq('studio_id', studioId)
    .eq('status', 'pending');
  
  if (pendingError) throw pendingError;
  
  // Get overdue invoices
  const { data: overdueInvoices, error: overdueError } = await supabase
    .from('invoices')
    .select('id, total')
    .eq('studio_id', studioId)
    .eq('status', 'overdue');
  
  if (overdueError) throw overdueError;
  
  return {
    outstanding: {
      total: pendingInvoices 
        ? pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) 
        : 0,
      count: pendingInvoices ? pendingInvoices.length : 0
    },
    overdue: {
      total: overdueInvoices 
        ? overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) 
        : 0,
      count: overdueInvoices ? overdueInvoices.length : 0
    }
  };
}

async function fetchOwnerStudentData(studioId: string) {
  // Get current active students
  const { data: currentStudents, error: currentError } = await supabase
    .from('students')
    .select('id')
    .eq('studio_id', studioId);
  
  if (currentError) throw currentError;
  
  // For comparison, we need to get student count from previous month
  // We'll use created_at for this purpose
  const prevMonthDate = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
  
  const { data: prevMonthStudents, error: prevError } = await supabase
    .from('students')
    .select('id')
    .eq('studio_id', studioId)
    .lt('created_at', prevMonthDate);
  
  if (prevError) throw prevError;
  
  return {
    current: currentStudents ? currentStudents.length : 0,
    change: (currentStudents ? currentStudents.length : 0) - (prevMonthStudents ? prevMonthStudents.length : 0)
  };
}

async function fetchOwnerClassData(studioId: string) {
  // Get date range for current week
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Query classes for this week
  const { data: weeklyClasses, error } = await supabase
    .from('classes')
    .select('id')
    .eq('studio_id', studioId)
    .gte('date', weekStart)
    .lte('date', weekEnd);
  
  if (error) throw error;
  
  return {
    thisWeek: weeklyClasses ? weeklyClasses.length : 0
  };
}

async function fetchOwnerTeacherData(studioId: string) {
  // Get current teachers
  const { data: currentTeachers, error: currentError } = await supabase
    .from('users')
    .select('id')
    .eq('studio_id', studioId)
    .eq('role', 'teacher');
  
  if (currentError) throw currentError;
  
  // For comparison, we need teacher count from previous month
  const prevMonthDate = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
  
  const { data: prevMonthTeachers, error: prevError } = await supabase
    .from('users')
    .select('id')
    .eq('studio_id', studioId)
    .eq('role', 'teacher')
    .lt('created_at', prevMonthDate);
  
  if (prevError) throw prevError;
  
  return {
    current: currentTeachers ? currentTeachers.length : 0,
    change: (currentTeachers ? currentTeachers.length : 0) - (prevMonthTeachers ? prevMonthTeachers.length : 0)
  };
}

async function fetchOwnerActivityData(studioId: string) {
  try {
    // First, get all owner user IDs for this studio
    const { data: owners, error: ownerError } = await supabase
      .from('users')
      .select('id')
      .eq('studio_id', studioId)
      .eq('role', 'owner');
    
    if (ownerError) throw ownerError;
    
    const ownerIds = owners.map(owner => owner.id);
    
    // Get recent notifications only for these owner IDs
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_id', ownerIds)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching activity data:', err);
    return [];
  }
}

// ======================= TEACHER DASHBOARD DATA =======================

export async function fetchTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  // Execute all data fetching in parallel for performance
  const [
    classesData,
    studentsData,
    hoursData,
    messagesData
  ] = await Promise.all([
    fetchTeacherClassesData(teacherId),
    fetchTeacherStudentsData(teacherId),
    fetchTeacherHoursData(teacherId),
    fetchTeacherMessagesData(teacherId)
  ]);
  
  return {
    classes: classesData,
    students: studentsData,
    hours: hoursData,
    schedule: classesData.today,
    messages: messagesData
  };
}

async function fetchTeacherClassesData(teacherId: string) {
    // Get today's date
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    
    // Query classes for today
    const { data: todayClasses, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        date,
        start_time,
        end_time,
        location:location_id (
          id,
          name
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('date', today)
      .order('start_time');
    
    if (error) throw error;
    
    // No classes found
    if (!todayClasses || todayClasses.length === 0) {
      return {
        today: [],
        next: null
      };
    }
    
    // For each class, fetch the student count
    const classesWithStudentCount = await Promise.all(todayClasses.map(async (classItem) => {
      // Count students enrolled in this class
      const { count, error: countError } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classItem.id);
      
      if (countError) {
        console.error('Error counting students for class:', classItem.id, countError);
        return {
          ...classItem,
          studentCount: 0
        };
      }
      
      return {
        ...classItem,
        studentCount: count || 0
      };
    }));
    
    // Find next class (first class with start_time after current time)
    let nextClass = null;
    if (classesWithStudentCount.length > 0) {
      const currentTime = format(now, 'HH:mm:ss');
      
      const upcomingClasses = classesWithStudentCount.filter(c => c.start_time > currentTime);
      if (upcomingClasses.length > 0) {
        // Get the first upcoming class
        const next = upcomingClasses[0];
        nextClass = {
          ...next,
          title: next.name,
          time: format(new Date(`2000-01-01T${next.start_time}`), 'h:mm a')
        };
      }
    }
    
    return {
      today: classesWithStudentCount,
      next: nextClass
    };
  }

async function fetchTeacherStudentsData(teacherId: string) {
  // Get date range for current week
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Get date range for previous week
  const prevWeekStart = format(startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevWeekEnd = format(endOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Get classes taught by this teacher this week
  const { data: currentWeekClasses, error: currentError } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', teacherId)
    .gte('date', weekStart)
    .lte('date', weekEnd);
  
  if (currentError) throw currentError;
  
  // Get classes taught by this teacher last week
  const { data: prevWeekClasses, error: prevError } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', teacherId)
    .gte('date', prevWeekStart)
    .lte('date', prevWeekEnd);
  
  if (prevError) throw prevError;
  
  // Get student enrollments for current week classes
  let currentWeekStudentIds: string[] = [];
  if (currentWeekClasses && currentWeekClasses.length > 0) {
    const currentClassIds = currentWeekClasses.map(c => c.id);
    
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_students')
      .select('student_id')
      .in('class_id', currentClassIds);
    
    if (enrollError) throw enrollError;
    
    // Get unique student IDs
    if (enrollments) {
      currentWeekStudentIds = Array.from(new Set(enrollments.map(e => e.student_id)));
    }
  }
  
  // Get student enrollments for previous week classes
  let prevWeekStudentIds: string[] = [];
  if (prevWeekClasses && prevWeekClasses.length > 0) {
    const prevClassIds = prevWeekClasses.map(c => c.id);
    
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_students')
      .select('student_id')
      .in('class_id', prevClassIds);
    
    if (enrollError) throw enrollError;
    
    // Get unique student IDs
    if (enrollments) {
      prevWeekStudentIds = Array.from(new Set(enrollments.map(e => e.student_id)));
    }
  }
  
  return {
    total: currentWeekStudentIds.length,
    change: currentWeekStudentIds.length - prevWeekStudentIds.length
  };
}

async function fetchTeacherHoursData(teacherId: string) {
  // Get date range for current week
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  
  // Query classes for this week
  const { data: weeklyClasses, error } = await supabase
    .from('classes')
    .select(`
      id,
      date,
      start_time,
      end_time
    `)
    .eq('teacher_id', teacherId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date, start_time');
  
  if (error) throw error;
  
  // Calculate teaching hours
  let totalHours = 0;
  let remainingHours = 0;
  
  if (weeklyClasses) {
    weeklyClasses.forEach(classItem => {
      // Create Date objects for start and end times
      const startDate = new Date(`${classItem.date}T${classItem.start_time}`);
      const endDate = new Date(`${classItem.date}T${classItem.end_time}`);
      
      // Calculate duration in hours
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      totalHours += durationHours;
      
      // Check if class is in the future or currently ongoing
      const isClassInFuture = isAfter(startDate, now) || 
        (isSameDay(startDate, now) && format(startDate, 'HH:mm:ss') > format(now, 'HH:mm:ss'));
      
      if (isClassInFuture) {
        remainingHours += durationHours;
      }
    });
  }
  
  return {
    total: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
    remaining: Math.round(remainingHours * 10) / 10
  };
}

async function fetchTeacherMessagesData(teacherId: string) {
  // Get conversations where teacher is a participant
  const { data: conversations, error: convError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', teacherId);
  
  if (convError) throw convError;
  
  // No conversations found
  if (!conversations || conversations.length === 0) {
    return [];
  }
  
  const conversationIds = conversations.map(c => c.conversation_id);
  
  // Get unread messages from these conversations
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      sender_id,
      sender:sender_id (
        id,
        name
      )
    `)
    .in('conversation_id', conversationIds)
    .neq('sender_id', teacherId) // Not sent by the teacher
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (msgError) throw msgError;
  
  // Add read status (we'll simulate this since there's no read field in messages table)
  const messagesWithReadStatus = messages ? messages.map(msg => ({
    ...msg,
    read: false // Assume all messages are unread for simplicity
  })) : [];
  
  return messagesWithReadStatus;
}

// ======================= PARENT DASHBOARD DATA =======================

export async function fetchParentDashboardData(parentId: string): Promise<ParentDashboardData> {
  // First get the parent's students
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, name')
    .eq('parent_id', parentId);
  
  if (studentError) throw studentError;
  
  if (!students || students.length === 0) {
    return {
      classes: {
        today: [],
        next: null,
        total: 0,
        remaining: 0
      },
      balance: {
        amount: 0,
        reason: 'No payments due'
      },
      schedule: [],
      updates: []
    };
  }
  
  const studentIds = students.map(s => s.id);
  
  // Execute all data fetching in parallel for performance
  const [
    classesData,
    balanceData,
    updatesData
  ] = await Promise.all([
    fetchParentClassesData(studentIds, students),
    fetchParentBalanceData(parentId),
    fetchParentUpdatesData(parentId)
  ]);
  
  return {
    classes: classesData,
    balance: balanceData,
    schedule: classesData.today.map(c => ({
      ...c,
      status: 'Confirmed' // Default status, could be dynamic
    })),
    updates: updatesData
  };
}

async function fetchParentClassesData(studentIds: string[], students: any[]) {
  if (studentIds.length === 0) {
    return {
      today: [],
      next: null,
      total: 0,
      remaining: 0
    };
  }
  
  // Get date range for current week
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  
  // Get enrollments for students
  const { data: enrollments, error: enrollError } = await supabase
    .from('class_students')
    .select('class_id, student_id')
    .in('student_id', studentIds);
  
  if (enrollError) throw enrollError;
  
  if (!enrollments || enrollments.length === 0) {
    return {
      today: [],
      next: null,
      total: 0,
      remaining: 0
    };
  }
  
  const classIds = enrollments.map(e => e.class_id);
  
  // Get classes for this week
  const { data: weeklyClasses, error: classError } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      date,
      start_time,
      end_time,
      teacher:teacher_id (
        id,
        name
      ),
      location:location_id (
        id,
        name
      )
    `)
    .in('id', classIds)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date, start_time');
  
  if (classError) throw classError;
  
  if (!weeklyClasses || weeklyClasses.length === 0) {
    return {
      today: [],
      next: null,
      total: 0,
      remaining: 0
    };
  }
  
  // Add student name to each class
  const classesWithStudentNames = weeklyClasses.map(classItem => {
    // Find enrollment for this class
    const enrollment = enrollments.find(e => e.class_id === classItem.id);
    // Find student name
    const student = enrollment ? students.find(s => s.id === enrollment.student_id)?.name || 'Unknown' : 'Unknown';
    
    return {
      ...classItem,
      student
    };
  });
  
  // Filter for today's classes
  const todayClasses = classesWithStudentNames.filter(c => c.date === today);
  
  // Find next class
  let nextClass = null;
  if (todayClasses.length > 0) {
    const currentTime = format(now, 'HH:mm:ss');
    
    const upcomingClasses = todayClasses.filter(c => c.start_time > currentTime);
    if (upcomingClasses.length > 0) {
      const next = upcomingClasses[0];
      nextClass = {
        ...next,
        title: next.name,
        time: format(new Date(`2000-01-01T${next.start_time}`), 'h:mm a')
      };
    }
  }
  
  // Count remaining classes this week
  const currentTime = format(now, 'HH:mm:ss');
  const remainingClasses = weeklyClasses.filter(c => {
    if (c.date > today) return true;
    if (c.date === today && c.start_time > currentTime) return true;
    return false;
  }).length;
  
  return {
    today: todayClasses,
    next: nextClass,
    total: weeklyClasses.length,
    remaining: remainingClasses
  };
}

async function fetchParentBalanceData(parentId: string) {
  // Get pending or overdue invoices
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, total, status, due_date, discount_reason')
    .eq('parent_id', parentId)
    .in('status', ['pending', 'overdue'])
    .order('due_date');
  
  if (error) throw error;
  
  if (!invoices || invoices.length === 0) {
    return {
      amount: 0,
      reason: 'No payments due'
    };
  }
  
  // Get the most urgent invoice (first overdue, then earliest due date)
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const targetInvoice = overdueInvoices.length > 0 
    ? overdueInvoices[0] // Get first overdue invoice
    : invoices[0]; // Otherwise get earliest due pending invoice
  
  return {
    amount: targetInvoice.total,
    reason: targetInvoice.discount_reason || 'Monthly Fees'
  };
}

async function fetchParentUpdatesData(parentId: string) {
  // Get recent notifications
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, created_at, type, read')
    .eq('user_id', parentId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) throw error;
  
  return data || [];
}
