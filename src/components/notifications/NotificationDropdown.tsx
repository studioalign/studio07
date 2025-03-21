// src/components/notifications/NotificationDropdown.tsx
import React, { useEffect } from 'react';
import { Bell, X, MessageSquare, DollarSign, Calendar, Users, BookOpen, AlertCircle, Award, UserPlus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, Notification } from '../../hooks/useNotifications';

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markAsRead, markAllAsRead, isLoading, unreadCount, updateUnreadCount } = useNotifications();
  
  // This will immediately update the badge count when component mounts
  useEffect(() => {
    // Immediately update the unread count
    updateUnreadCount();
  }, [updateUnreadCount]);

  const getIcon = (notification: Notification) => {
    const type = notification.type.split('_')[0]; // Get the first part of the type
    
    switch (type) {
      case 'message':
      case 'new':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'class':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'student':
        return <Users className="w-4 h-4 text-orange-500" />;
      case 'attendance':
        return <BookOpen className="w-4 h-4 text-red-500" />;
      case 'parent':
      case 'staff':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'monthly':
        return <DollarSign className="w-4 h-4 text-teal-500" />;
      case 'birthday':
        return <Award className="w-4 h-4 text-yellow-500" />;
      case 'unauthorized':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    // Don't close the dropdown so user can see the updates
  };

  return (
    <div className="w-full sm:w-96 bg-white rounded-lg shadow-lg py-1 mx-4 sm:mx-0">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead} 
              className="text-brand-primary hover:text-brand-secondary-400 text-sm flex items-center"
              title="Mark all as read"
            >
              <Check className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  !notification.read ? 'bg-brand-secondary-100/10' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    {getIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <span className="inline-block w-2 h-2 bg-brand-primary rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-2">
        <Link
          to="/dashboard/notifications"
          className="block text-center text-sm text-brand-primary hover:text-brand-secondary-400"
          onClick={onClose}
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
}
