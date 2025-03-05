import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { useRecurringPayments } from '../../hooks/useRecurringPayments';
import { formatCurrency } from '../../utils/formatters';
import EditRecurringPaymentModal from './EditRecurringPaymentModal';

export default function RecurringPaymentList() {
  const { recurringPayments, loading, error, deleteRecurringPayment } = useRecurringPayments();
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'term':
        return 'Per Term';
      case 'annual':
        return 'Annual';
      default:
        return interval;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {recurringPayments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No recurring payments</p>
          <p className="text-sm">Set up your first recurring payment to get started</p>
        </div>
      ) : (
        recurringPayments.map((payment) => (
          <div
            key={payment.id}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-brand-primary">
                    {payment.student.name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    payment.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </div>
                <p className="text-brand-secondary-400 mt-1">
                  {payment.plan.name}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {formatCurrency(payment.plan.amount)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatInterval(payment.plan.interval)}
                  </div>
                </div>
                {payment.start_date && (
                  <p className="text-sm text-gray-500 mt-2">
                    Started {new Date(payment.start_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingPayment(payment)}
                  className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
                  title="Edit recurring payment"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deleteRecurringPayment(payment.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
                  title="Cancel recurring payment"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {payment.next_payment_date && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-brand-secondary-400">
                  Next Payment: {new Date(payment.next_payment_date).toLocaleDateString()} - {formatCurrency(payment.plan.amount)}
                </p>
              </div>
            )}
          </div>
        ))
      )}

      {editingPayment && (
        <EditRecurringPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={() => {
            setEditingPayment(null);
            fetchRecurringPayments();
          }}
        />
      )}
    </div>
  );
}