import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatCurrency } from '../../utils/formatters';
import { FileText, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import ProcessPaymentModal from './ProcessPaymentModal';

interface Invoice {
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
}

export default function ParentInvoices() {
  const { profile } = useAuth();
  const { currency } = useLocalization();
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-2024-001',
      status: 'pending',
      due_date: '2024-02-15',
      subtotal: 150.00,
      tax: 15.00,
      total: 165.00,
      notes: 'Monthly tuition payment for February 2024',
      items: [
        {
          id: '1',
          description: 'Ballet Class - February 2024',
          quantity: 1,
          unit_price: 150.00,
          total: 150.00,
          student: {
            name: 'Sarah Johnson'
          }
        }
      ]
    },
    {
      id: '2',
      number: 'INV-2024-002',
      status: 'paid',
      due_date: '2024-01-15',
      subtotal: 300.00,
      tax: 30.00,
      total: 330.00,
      notes: 'Monthly tuition payment for January 2024',
      items: [
        {
          id: '2',
          description: 'Ballet Class - January 2024',
          quantity: 1,
          unit_price: 150.00,
          total: 150.00,
          student: {
            name: 'Sarah Johnson'
          }
        },
        {
          id: '3',
          description: 'Jazz Class - January 2024',
          quantity: 1,
          unit_price: 150.00,
          total: 150.00,
          student: {
            name: 'Michael Johnson'
          }
        }
      ]
    },
    {
      id: '3',
      number: 'INV-2024-003',
      status: 'overdue',
      due_date: '2024-02-01',
      subtotal: 200.00,
      tax: 20.00,
      total: 220.00,
      notes: 'Costume payment for Spring Recital',
      items: [
        {
          id: '4',
          description: 'Ballet Costume - Spring Recital',
          quantity: 1,
          unit_price: 100.00,
          total: 100.00,
          student: {
            name: 'Sarah Johnson'
          }
        },
        {
          id: '5',
          description: 'Jazz Costume - Spring Recital',
          quantity: 1,
          unit_price: 100.00,
          total: 100.00,
          student: {
            name: 'Michael Johnson'
          }
        }
      ]
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [studioInfo, setStudioInfo] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
  } | null>(null);

  const fetchStudioInfo = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('studio:studios!users_studio_id_fkey(name, address, phone, email)')
        .eq('id', profile?.id)
        .single();

      if (userData?.studio) {
        setStudioInfo(userData.studio);
      }
    } catch (err) {
      console.error('Error fetching studio info:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      // In a real implementation, this would fetch from Supabase
      // For now, we're using the mock data initialized in state
      setLoading(false);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;
    fetchStudioInfo();
    // Set mock studio info
    setStudioInfo({
      name: 'Dance Studio Demo',
      address: '123 Main Street, Anytown, ST 12345',
      phone: '(555) 123-4567',
      email: 'info@dancestudiodemo.com'
    });
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [profile?.id]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'pending') {
      return ['pending', 'overdue'].includes(invoice.status);
    }
    if (filter === 'paid') {
      return invoice.status === 'paid';
    }
    return true;
  });

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Payments</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Payments</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${
                filter === 'all'
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md ${
                filter === 'pending'
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-md ${
                filter === 'paid'
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        <div className="divide-y">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(invoice.status)}
                    <h3 className="font-medium text-gray-900">{invoice.number}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        invoice.status
                      )}`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Due {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                  <div className="mt-2">
                    {invoice.items.map((item) => (
                      <p key={item.id} className="text-sm text-gray-600">
                        {item.student.name} - {item.description}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-primary">
                    {formatCurrency(invoice.total, currency)}
                  </p>
                  {['pending', 'overdue'].includes(invoice.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(invoice);
                      }}
                      className="mt-2 flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <>
          <InvoiceDetailsModal
            invoice={selectedInvoice}
            studio={studioInfo}
            onClose={() => setSelectedInvoice(null)}
            onPayClick={() => {
              setShowPaymentModal(true);
            }}
          />
          {showPaymentModal && (
            <ProcessPaymentModal
              invoice={selectedInvoice}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedInvoice(null);
              }}
              onSuccess={() => {
                setShowPaymentModal(false);
                setSelectedInvoice(null);
                // Refresh mock data would go here
              }}
            />
          )}
        </>
      )}
    </div>
  );
}