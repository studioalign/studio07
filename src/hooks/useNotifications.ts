// src/hooks/useNotifications.ts - Improved version
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
      
      // Calculate and update unread count explicitly
      const unreadNotifications = (data || []).filter(n => !n.read);
      setUnreadCount(unreadNotifications.length);
      
      console.log(`Fetched ${data?.length || 0} notifications, ${unreadNotifications.length} unread`);
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
      // Find the notification to check if it's already read
      const notification = notifications.find(n => n.id === id);
      if (!notification || notification.read) return; // Already read, nothing to do
      
      // Optimistically update UI first
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Also update the unread count immediately
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log(`Marking notification ${id} as read, new unread count:`, unreadCount - 1);
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

    const updateUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Count unread notifications directly from current state
      const unreadNotifications = notifications.filter(n => !n.read);
      setUnreadCount(unreadNotifications.length);
      
      // Optionally fetch from server to ensure accuracy
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false);
      
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error updating unread count:', err);
    }
  }, [user?.id, notifications]);
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    try {
      // Count how many unread notifications we have before we update
      const unreadBefore = notifications.filter(n => !n.read).length;
      if (unreadBefore === 0) return; // Nothing to do
      
      console.log(`Marking all ${unreadBefore} notifications as read`);
      
      // Optimistically update UI first
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Update unread count to zero immediately
      setUnreadCount(0);
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          updated_at: new Date().toISOString() 
        })
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
        console.log(`Dismissed unread notification, new count:`, unreadCount - 1);
      }
      
      // Then update in database
      const { error } = await supabase
        .from('notifications')
        .update({ 
          dismissed: true, 
          updated_at: new Date().toISOString() 
        })
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
        .update({ 
          dismissed: true, 
          updated_at: new Date().toISOString() 
        })
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
    } else {
      // Reset state if user is logged out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id, fetchNotifications]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('Setting up notification subscription for user', user.id);
    
    const subscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload.new);
          const newNotification = payload.new as Notification;
          
          // Add to notifications array
          setNotifications(prev => [newNotification, ...prev]);
          
          // Update unread count for new notifications
          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1);
            console.log('Incremented unread count for new notification:', unreadCount + 1);
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
          
          console.log('Notification update detected:', { 
            id: updated.id,
            oldRead: previous.read,
            newRead: updated.read,
            oldDismissed: previous.dismissed,
            newDismissed: updated.dismissed
          });
          
          if (updated.dismissed) {
            // If dismissed, remove from the list
            setNotifications(prev => 
              prev.filter(n => n.id !== updated.id)
            );
            
            // If it was unread before being dismissed, decrement the count
            if (!previous.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
              console.log('Decreased unread count for dismissed notification:', Math.max(0, unreadCount - 1));
            }
          } else {
            // Handle read status changes
            if (!previous.read && updated.read) {
              // If it was marked as read, decrement the count
              setUnreadCount(prev => Math.max(0, prev - 1));
              console.log('Decreased unread count for read notification:', Math.max(0, unreadCount - 1));
            } else if (previous.read && !updated.read) {
              // If it was marked as unread, increment the count
              setUnreadCount(prev => prev + 1);
              console.log('Increased unread count for unread notification:', unreadCount + 1);
            }
            
            // Update the notification
            setNotifications(prev => 
              prev.map(n => n.id === updated.id ? updated : n)
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Notification subscription status:', status, err ? `Error: ${err.message}` : 'OK');
      });
    
    return () => {
      console.log('Cleaning up notification subscription');
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
    unreadCount,
    updateUnreadCount
  };
}
