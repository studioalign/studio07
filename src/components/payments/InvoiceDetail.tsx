import React, { useState } from 'react';
import { FileText, Printer, Send, Edit2, CreditCard } from 'lucide-react';
import ProcessPaymentModal from './ProcessPaymentModal';
import PaymentHistory from './PaymentHistory';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  type: string;
  student: {
    name: string;
  };
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  parent: {
    name: string;
    email: string;
  };
  items: InvoiceItem[];
}
import { useLocalization } from '../../contexts/LocalizationContext';

interface InvoiceDetailProps {
  invoice: Invoice;
  onEdit: () => void;
  onRefresh: () => void;
}

export default function InvoiceDetail({ invoice, onEdit, onRefresh }: InvoiceDetailProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { currency } = useLocalization();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-brand-primary">{invoice.number}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
          <p className="text-brand-secondary-400 mt-1">
            Due {new Date(invoice.due_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="Edit invoice"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
            title="Print invoice"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payment
          </button>
        </div>
      </div>

      <div className="p-6 border-t">
        <PaymentHistory invoiceId={invoice.id} onRefresh={onRefresh} />
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-medium text-brand-secondary-400 mb-1">Bill To</h3>
            <p className="font-medium text-gray-900">{invoice.parent.name}</p>
            <p className="text-gray-500">{invoice.parent.email}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-medium text-brand-secondary-400 mb-1">Amount Due</h3>
            <p className="text-3xl font-bold text-brand-primary">
              {formatCurrency(invoice.total, currency)}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium text-brand-primary mb-4">Invoice Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400">Description</th>
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400">Student</th>
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400">Type</th>
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">Quantity</th>
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">Unit Price</th>
                  <th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4">{item.description}</td>
                    <td className="py-4">{item.student.name}</td>
                    <td className="py-4">
                      <span className="capitalize">{item.type}</span>
                    </td>
                    <td className="py-4 text-right">{item.quantity}</td>
                    <td className="py-4 text-right">{formatCurrency(item.unit_price, currency)}</td>
                    <td className="py-4 text-right">{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <td colSpan={5} className="py-4 text-right font-medium">Subtotal</td>
                  <td className="py-4 text-right">{formatCurrency(invoice.subtotal, currency)}</td>
                </tr>
                {invoice.tax > 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-right font-medium">Tax</td>
                    <td className="py-4 text-right">{formatCurrency(invoice.tax, currency)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={5} className="py-4 text-right font-medium text-lg">Total</td>
                  <td className="py-4 text-right font-bold text-lg">{formatCurrency(invoice.total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {invoice.notes && (
          <div>
            <h3 className="text-sm font-medium text-brand-secondary-400 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <ProcessPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}