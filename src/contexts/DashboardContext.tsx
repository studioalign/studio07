// src/contexts/DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  fetchOwnerDashboardData, 
  fetchTeacherDashboardData, 
  fetchParentDashboardData 
} from '../services/dashboardService';

// Define types for each dashboard data structure
export type OwnerDashboardData = {
  revenue: {
    current: number;
    percentChange: number;
  };
  invoices: {
    outstanding: {
      total: number;
      count: number;
    };
    overdue: {
      total: number;
      count: number;
    };
  };
  students: {
    current: number;
    change: number;
  };
  classes: {
    thisWeek: number;
  };
  teachers: {
    current: number;
    change: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    message: string;
    created_at: string;
    type: string;
    priority: string;
    read: boolean;
  }>;
};

export type TeacherDashboardData = {
  classes: {
    today: Array<{
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      date: string;
      studentCount: number;
      location: {
        id: string;
        name: string;
      } | null;
    }>;
    next: {
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      title?: string;
      time?: string;
      studentCount?: number;
    } | null;
  };
  students: {
    total: number;
    change: number;
  };
  hours: {
    total: number;
    remaining: number;
  };
  schedule: Array<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    location: {
      id: string;
      name: string;
    } | null;
    studentCount: number;
  }>;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      name: string;
    };
    read: boolean;
  }>;
};

export type ParentDashboardData = {
  classes: {
    today: Array<{
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      date: string;
      teacher: {
        id: string;
        name: string;
      };
      location: {
        id: string;
        name: string;
      } | null;
      student: string;
    }>;
    next: {
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      title?: string;
      time?: string;
    } | null;
    total: number;
    remaining: number;
  };
  balance: {
    amount: number;
    reason: string;
  };
  schedule: Array<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    teacher: {
      id: string;
      name: string;
    };
    location: {
      id: string;
      name: string;
    } | null;
    student: string;
    status: string;
  }>;
  updates: Array<{
    id: string;
    title: string;
    message: string;
    created_at: string;
    type: string;
    read: boolean;
  }>;
};

// Unified dashboard data type
export type DashboardData = OwnerDashboardData | TeacherDashboardData | ParentDashboardData;

// Create the context
interface DashboardContextType {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider component
interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Function to fetch dashboard data based on user role
  const fetchDashboardData = async () => {
    if (!profile || !profile.studio?.id) {
      setIsLoading(false);
      return;
    }

    // Remove the loading check that was causing the deadlock
    // if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching dashboard data for role:', profile.role);
      let dashboardData;

      if (profile.role === 'owner') {
        dashboardData = await fetchOwnerDashboardData(profile.studio.id);
      } else if (profile.role === 'teacher') {
        dashboardData = await fetchTeacherDashboardData(profile.id);
      } else if (profile.role === 'parent') {
        dashboardData = await fetchParentDashboardData(profile.id);
      } else {
        throw new Error('Invalid user role');
      }

      console.log('Dashboard data fetched successfully');
      setData(dashboardData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (profile) {
      // Simplified condition to fetch data when profile is available
      fetchDashboardData();
    }
  }, [profile]); // Only depend on profile changes

  // Function to manually refresh the data
  const refreshData = async () => {
    await fetchDashboardData();
  };

  return (
    <DashboardContext.Provider value={{ data, isLoading, error, refreshData }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Hook to use the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
