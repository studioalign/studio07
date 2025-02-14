import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'message' | 'payment' | 'class' | 'enrollment';
  message: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Mock notifications based on user role
    const mockNotifications: Notification[] = [];
    const now = new Date();

    if (profile?.role === 'owner') {
      mockNotifications.push(
        {
          id: '1',
          type: 'payment',
          message: 'New payment received from Sarah Johnson',
          read: false,
          created_at: new Date(now.getTime() - 30 * 60000).toISOString(),
        },
        {
          id: '2',
          type: 'enrollment',
          message: 'New student enrollment: Michael Smith in Ballet Beginners',
          read: false,
          created_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
        }
      );
    } else if (profile?.role === 'teacher') {
      mockNotifications.push(
        {
          id: '3',
          type: 'class',
          message: 'Your next class starts in 30 minutes: Ballet Intermediate',
          read: false,
          created_at: new Date(now.getTime() - 15 * 60000).toISOString(),
        },
        {
          id: '4',
          type: 'message',
          message: 'New message from parent regarding student absence',
          read: true,
          created_at: new Date(now.getTime() - 4 * 3600000).toISOString(),
        }
      );
    } else if (profile?.role === 'parent') {
      mockNotifications.push(
        {
          id: '5',
          type: 'payment',
          message: 'Payment reminder: Monthly tuition due in 3 days',
          read: false,
          created_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
        },
        {
          id: '6',
          type: 'class',
          message: 'Class schedule change: Hip Hop moved to 5 PM next week',
          read: false,
          created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
        }
      );
    }

    setNotifications(mockNotifications);
  }, [profile?.role]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    markAsRead,
    clearAll,
    unreadCount: notifications.filter(n => !n.read).length,
  };
}