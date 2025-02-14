import React from 'react';
import { Bell, X, MessageSquare, DollarSign, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markAsRead } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'class':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'enrollment':
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="w-full sm:w-96 bg-white rounded-lg shadow-lg py-1 mx-4 sm:mx-0">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="font-medium text-gray-900">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 ${
                  !notification.read ? 'bg-brand-secondary-100/10' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
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