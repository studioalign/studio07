import React from 'react';
import { Bell, MessageSquare, DollarSign, Calendar, Users, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationsPage() {
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [filter, setFilter] = React.useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'class':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'enrollment':
        return <Users className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredNotifications = filter
    ? notifications.filter(n => n.type === filter)
    : notifications;

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
              <option value="message">Messages</option>
              <option value="payment">Payments</option>
              <option value="class">Classes</option>
              <option value="enrollment">Enrollments</option>
            </select>
            <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <button
            onClick={clearAll}
            className="text-sm text-brand-primary hover:text-brand-secondary-400"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 ${
                  !notification.read ? 'bg-brand-secondary-100/10' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
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
    </div>
  );
}