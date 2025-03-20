// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  entity_id?: string;
  entity_type?: string;
  link?: string;
  details?: any;
  read: boolean;
  dismissed: boolean;
  requires_action: boolean;
  email_required: boolean;
  email_sent: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0); // Store unread count separately

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setNotifications(data || []);
      
      // Update unread count
      const unreadNotifications = (data || []).filter(n => !n.read);
      setUnreadCount(unreadNotifications.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      // Optimistically update UI first
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Also update the unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    try {
      // Count how many unread notifications we have before we update
      const unreadBefore = notifications.filter(n => !n.read).length;
      
      // Optimistically update UI first
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Update unread count to zero
      setUnreadCount(0);
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  // Dismiss notification
  const dismissNotification = async (id: string) => {
    try {
      // Check if the notification is unread before dismissing
      const notificationToDismiss = notifications.find(n => n.id === id);
      const wasUnread = notificationToDismiss && !notificationToDismiss.read;
      
      // Optimistically update UI first
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
      
      // If we're dismissing an unread notification, update the count
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error dismissing notification:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  // Dismiss all notifications
  const dismissAll = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    try {
      // Optimistically update UI first
      setNotifications([]);
      
      // Reset unread count to zero
      setUnreadCount(0);
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('dismissed', false);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error dismissing all notifications:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;
    
    const subscription = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Update unread count for new notifications
          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update the notification in our local state if it's updated externally
          const updated = payload.new as Notification;
          const previous = payload.old as Notification;
          
          if (updated.dismissed) {
            // If dismissed, remove from the list
            setNotifications(prev => 
              prev.filter(n => n.id !== updated.id)
            );
            
            // If it was unread before being dismissed, decrement the count
            if (!previous.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else {
            // Handle read status changes
            if (!previous.read && updated.read) {
              // If it was marked as read, decrement the count
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (previous.read && !updated.read) {
              // If it was marked as unread, increment the count
              setUnreadCount(prev => prev + 1);
            }
            
            // Update the notification
            setNotifications(prev => 
              prev.map(n => n.id === updated.id ? updated : n)
            );
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return {
    notifications,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
    fetchNotifications,
    unreadCount, // This will now update in real-time
  };
}
