import React from 'react';
import { X, Download, CreditCard, Building2, Calendar } from 'lucide-react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceDetailsModalProps {
  invoice: {
    id: string;
    number: string;
    status: string;
    due_date: string;
    subtotal: number;
    tax: number;
    total: number;
    notes: string | null;
    items: {
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      student: {
        name: string;
      };
    }[];
  };
  onClose: () => void;
  onPayClick?: () => void;
  studio?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export default function InvoiceDetailsModal({ invoice, onClose, onPayClick, studio }: InvoiceDetailsModalProps) {
  const { currency } = useLocalization();

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate and download a PDF
    // For now, we'll just show an alert
    alert('PDF download functionality will be implemented here');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-brand-primary">Invoice {invoice.number}</h2>
            <p className="text-brand-secondary-400">
              Due {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
              title="Download PDF"
            >
              <Download className="w-6 h-6" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Studio and Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {studio && (
              <div>
                <div className="flex items-center text-brand-primary mb-2">
                  <Building2 className="w-5 h-5 mr-2" />
                  <h3 className="font-medium">{studio.name}</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{studio.address}</p>
                  <p>{studio.phone}</p>
                  <p>{studio.email}</p>
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center text-brand-primary mb-2">
                <Calendar className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Invoice Details</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Invoice Number: {invoice.number}</p>
                <p>Issue Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                <p>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                <p>Status: <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <h3 className="text-lg font-medium text-brand-primary mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} />
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      Subtotal
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(invoice.subtotal, currency)}
                    </td>
                  </tr>
                  {invoice.tax > 0 && (
                    <tr>
                      <td colSpan={3} />
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        Tax
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(invoice.tax, currency)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} />
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-brand-primary text-right">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-brand-primary text-right">
                      {formatCurrency(invoice.total, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-medium text-brand-primary mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Button */}
          {['pending', 'overdue'].includes(invoice.status) && onPayClick && (
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={onPayClick}
                className="flex items-center px-6 py-3 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Pay {formatCurrency(invoice.total, currency)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}