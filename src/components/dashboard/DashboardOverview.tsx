// src/components/dashboard/DashboardOverview.tsx
import React from 'react';
import {
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  MessageSquare,
  Clock,
  RefreshCw
} from 'lucide-react';
import StatsCard from './StatsCard';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatCurrency } from '../../utils/formatters';
import { format, formatDistanceToNow } from 'date-fns';

export default function DashboardOverview() {
  const { data, isLoading, error, refreshData } = useDashboard();
  const { profile } = useAuth();
  const { currency } = useLocalization();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-primary mb-0">Dashboard</h1>
          <button 
            disabled
            className="flex items-center space-x-2 text-gray-400 cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Refreshing...</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h1 className="text-2xl font-bold text-brand-primary mb-4">Dashboard</h1>
        <div className="text-red-600">
          <p>Error loading dashboard data: {error}</p>
          <button
            onClick={refreshData}
            className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render based on user role
  if (profile?.role === 'owner' && data) {
    const ownerData = data as any; // Type assertion for owner data
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-primary mb-0">Studio Overview</h1>
          <button 
            onClick={refreshData}
            className="flex items-center space-x-2 text-brand-primary hover:text-brand-secondary-400"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(ownerData.revenue.current, currency)}
            icon={DollarSign}
            trend={`${ownerData.revenue.percentChange >= 0 ? '+' : ''}${ownerData.revenue.percentChange}%`}
            description="vs last month"
          />
          <StatsCard
            title="Outstanding Balance"
            value={formatCurrency(ownerData.invoices.outstanding.total, currency)}
            icon={TrendingUp}
            trend={`${ownerData.invoices.outstanding.count} invoices`}
            description="pending payment"
          />
          <StatsCard
            title="Overdue Payments"
            value={formatCurrency(ownerData.invoices.overdue.total, currency)}
            icon={AlertCircle}
            trend={`${ownerData.invoices.overdue.count} invoices`}
            description="overdue"
          />
        </div>

        {/* Studio Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatsCard
            title="Active Students"
            value={ownerData.students.current.toString()}
            icon={GraduationCap}
            trend={`${ownerData.students.change >= 0 ? '+' : ''}${ownerData.students.change}`}
            description={`${Math.abs(ownerData.students.change) === 1 ? 'student' : 'students'} this month`}
          />
          <StatsCard
            title="Active Classes"
            value={ownerData.classes.thisWeek.toString()}
            icon={BookOpen}
            trend="this week"
            description="scheduled classes"
          />
          <StatsCard
            title="Teachers"
            value={ownerData.teachers.current.toString()}
            icon={Users}
            trend={ownerData.teachers.change === 0 
              ? "No change" 
              : `${ownerData.teachers.change > 0 ? '+' : ''}${ownerData.teachers.change}`}
            description={ownerData.teachers.change === 0 
              ? "" 
              : `${Math.abs(ownerData.teachers.change) === 1 ? 'teacher' : 'teachers'} this month`}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">
            Recent Activity
          </h2>
          {ownerData.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {ownerData.recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${getActivityIconColor(activity.type)}`}>
                    {getActivityIcon(activity.type, "w-4 h-4")}
                  </div>
                  <div>
                    <p className="text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.message}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          )}
        </div>
      </div>
    );
  }
  
  if (profile?.role === 'teacher' && data) {
    const teacherData = data as any; // Type assertion for teacher data
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-primary mb-0">Teacher Dashboard</h1>
          <button 
            onClick={refreshData}
            className="flex items-center space-x-2 text-brand-primary hover:text-brand-secondary-400"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Today's Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Today's Classes"
            value={teacherData.classes.today.length.toString()}
            icon={Calendar}
            trend={teacherData.classes.next 
              ? `Next: ${teacherData.classes.next.time}` 
              : "No more classes today"}
            description={teacherData.classes.next 
              ? teacherData.classes.next.title 
              : ""}
          />
          <StatsCard
            title="Total Students"
            value={teacherData.students.total.toString()}
            icon={Users}
            trend={`${teacherData.students.change >= 0 ? '+' : ''}${teacherData.students.change}`}
            description="this week"
          />
          <StatsCard
            title="Class Hours"
            value={teacherData.hours.total.toString()}
            icon={Clock}
            trend="This Week"
            description={`${teacherData.hours.remaining} remaining`}
          />
        </div>

        {/* Upcoming Classes */}
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-brand-primary">
                Today's Schedule
                </h2>
            </div>
            <div className="p-6">
                {teacherData.schedule.length > 0 ? (
                <div className="space-y-6">
                    {teacherData.schedule.map((classItem: any) => (
                    <div key={classItem.id} className="flex items-center justify-between">
                        <div>
                        <h3 className="font-medium text-gray-900">
                            {classItem.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {classItem.location?.name || 'Location TBD'} • {classItem.studentCount} students
                        </p>
                        </div>
                        <div className="text-right">
                        <p className="text-brand-primary font-medium">
                            {formatClassTime(classItem.start_time)} - {formatClassTime(classItem.end_time)}
                        </p>
                        <button className="text-sm text-brand-accent hover:text-brand-secondary-400">
                            Take Attendance
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <p className="text-center text-gray-500 py-4">No classes scheduled for today</p>
                )}
            </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">
            Recent Messages
          </h2>
          {teacherData.messages.length > 0 ? (
            <div className="space-y-4">
              {teacherData.messages.map((message: any) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-brand-secondary-100 flex items-center justify-center">
                    <span className="text-brand-primary font-medium">
                      {getInitials(message.sender.name)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900">{message.sender.name}</p>
                    <p className="text-sm text-gray-500">
                      {message.content.length > 60 
                        ? `${message.content.substring(0, 60)}...` 
                        : message.content}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent messages</p>
          )}
        </div>
      </div>
    );
  }
  
  if (profile?.role === 'parent' && data) {
    const parentData = data as any; // Type assertion for parent data
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-primary mb-0">Parent Dashboard</h1>
          <button 
            onClick={refreshData}
            className="flex items-center space-x-2 text-brand-primary hover:text-brand-secondary-400"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Student Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Upcoming Classes"
            value={parentData.classes.today.length.toString()}
            icon={Calendar}
            trend="Today"
            description={parentData.classes.next 
              ? `Next: ${parentData.classes.next.time}` 
              : "No more classes today"}
          />
          <StatsCard
            title="Total Classes"
            value={parentData.classes.total.toString()}
            icon={BookOpen}
            trend={`${parentData.classes.remaining} classes`}
            description="remaining this week"
          />
          <StatsCard
            title="Balance Due"
            value={formatCurrency(parentData.balance.amount, currency)}
            icon={DollarSign}
            trend={parentData.balance.amount > 0 ? "Due soon" : "Paid"}
            description={parentData.balance.reason}
          />
        </div>

        {/* Today's Classes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-brand-primary">
              Today's Classes
            </h2>
          </div>
          <div className="p-6">
            {parentData.schedule.length > 0 ? (
              <div className="space-y-6">
                {parentData.schedule.map((classItem: any) => (
                  <div key={classItem.id} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {classItem.student} - {classItem.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {classItem.teacher?.name || 'TBD'} • {classItem.location?.name || 'Location TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-brand-primary font-medium">
                        {formatClassTime(classItem.start_time)} - {formatClassTime(classItem.end_time)}
                      </p>
                      <span className="text-sm text-green-600">{classItem.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No classes scheduled for today</p>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">
            Recent Updates
          </h2>
          {parentData.updates.length > 0 ? (
            <div className="space-y-4">
              {parentData.updates.map((update: any) => (
                <div key={update.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${getUpdateIconColor(update.type)}`}>
                    {getUpdateIcon(update.type, "w-4 h-4")}
                  </div>
                  <div>
                    <p className="text-gray-900">{update.title}</p>
                    <p className="text-sm text-gray-500">{update.message}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent updates</p>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="p-6 bg-yellow-50 rounded-lg">
      <h1 className="text-2xl font-bold text-brand-primary mb-4">Dashboard</h1>
      <p className="text-yellow-700">
        Unable to load dashboard for your user role. Please contact support.
      </p>
    </div>
  );
}

// Helper functions
function formatClassTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  return format(date, 'h:mm a');
}

function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function getStudentCount(classItem: any): number {
    // Use the actual student count from the class data
    return classItem.studentCount || 0;
}

function getActivityIcon(type: string, className: string) {
  switch (type.split('_')[0]) {
    case 'message':
    case 'new':
      return <MessageSquare className={className} />;
    case 'payment':
      return <DollarSign className={className} />;
    case 'class':
      return <Calendar className={className} />;
    case 'student':
      return <GraduationCap className={className} />;
    default:
      return <AlertCircle className={className} />;
  }
}

function getActivityIconColor(type: string): string {
  switch (type.split('_')[0]) {
    case 'message':
    case 'new':
      return 'bg-blue-100 text-blue-600';
    case 'payment':
      return 'bg-green-100 text-green-600';
    case 'class':
      return 'bg-purple-100 text-purple-600';
    case 'student':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getUpdateIcon(type: string, className: string) {
  switch (type.split('_')[0]) {
    case 'message':
      return <MessageSquare className={className} />;
    case 'payment':
      return <DollarSign className={className} />;
    case 'class':
      return <Calendar className={className} />;
    case 'attendance':
      return <Users className={className} />;
    default:
      return <AlertCircle className={className} />;
  }
}

function getUpdateIconColor(type: string): string {
  switch (type.split('_')[0]) {
    case 'message':
      return 'bg-blue-100 text-blue-600';
    case 'payment':
      return 'bg-green-100 text-green-600';
    case 'class':
      return 'bg-purple-100 text-purple-600';
    case 'attendance':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}