// src/components/notifications/NotificationsPage.tsx
import React, { useState } from 'react';
import { Bell, MessageSquare, DollarSign, Calendar, Users, Filter, BookOpen, AlertCircle, Award, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, Notification } from '../../hooks/useNotifications';

export default function NotificationsPage() {
  const { notifications, markAsRead, dismissAll, dismissNotification, isLoading } = useNotifications();
  const [filter, setFilter] = useState<string | null>(null);

  const getIcon = (notification: Notification) => {
    const type = notification.type.split('_')[0]; // Get the first part of the type
    
    switch (type) {
      case 'message':
      case 'new':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'class':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'student':
        return <Users className="w-5 h-5 text-orange-500" />;
      case 'attendance':
        return <BookOpen className="w-5 h-5 text-red-500" />;
      case 'parent':
      case 'staff':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'monthly':
        return <DollarSign className="w-5 h-5 text-teal-500" />;
      case 'birthday':
        return <Award className="w-5 h-5 text-yellow-500" />;
      case 'unauthorized':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Group notification types into categories for filtering
  const getTypeCategory = (type: string) => {
    if (type.includes('message') || type.includes('post') || type.includes('comment')) {
      return 'communication';
    } else if (type.includes('payment')) {
      return 'payment';
    } else if (type.includes('class') || type.includes('attendance')) {
      return 'class';
    } else if (type.includes('student') || type.includes('enrollment')) {
      return 'student';
    } else if (type.includes('parent') || type.includes('staff') || type.includes('account')) {
      return 'account';
    }
    return 'other';
  };

  const filteredNotifications = filter
    ? notifications.filter(n => getTypeCategory(n.type) === filter)
    : notifications;

  // Priority ordering - show urgent/high priority first
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Notifications</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <select
              value={filter || ''}
              onChange={(e) => setFilter(e.target.value || null)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent appearance-none"
            >
              <option value="">All Notifications</option>
              <option value="communication">Communication</option>
              <option value="payment">Payments</option>
              <option value="class">Classes</option>
              <option value="student">Students</option>
              <option value="account">Accounts</option>
            </select>
            <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button
            onClick={dismissAll}
            className="text-sm text-brand-primary hover:text-brand-secondary-400"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 ${
                  !notification.read ? 'bg-brand-secondary-100/10' : ''
                } ${notification.priority === 'urgent' ? 'border-l-4 border-red-500' : notification.priority === 'high' ? 'border-l-4 border-orange-500' : ''}`}
              >
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    {getIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                    <p className="font-medium text-gray-900">{notification.title}</p>
                    <p className="text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                      {notification.requires_action && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                          Action Required
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col space-y-2">
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-brand-primary rounded-full" />
                    )}
                    <button 
                      onClick={() => dismissNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}