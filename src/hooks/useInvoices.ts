import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  parent: {
    name: string;
    email: string;
  };
  created_at: string;
}

interface UseInvoicesOptions {
  status?: InvoiceStatus;
  search?: string;
}

export function useInvoices({ status, search }: UseInvoicesOptions = {}) {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<InvoiceStatus, number>>({
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    refunded: 0
  });

  useEffect(() => {
    if (!profile?.studio?.id) return;
    fetchInvoices();
  }, [profile?.studio?.id]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          id,
          number,
          status,
          due_date,
          subtotal,
          tax,
          total,
          created_at,
          parent:users (
            name,
            email
          )
        `)
        .eq('studio_id', profile?.studio?.id + "")
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`
          number.ilike.%${search}%,
        `);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const filteredData = data?.filter((invoice) => 
        invoice.parent.name === search || invoice.parent.email === search
      );

      setInvoices(filteredData);

      // Fetch counts for each status
      const { data: countData, error: countError } = await supabase
        .from('invoices')
        .select('status, count')
        .eq('studio_id', profile?.studio?.id + '')
        .select('*')
        .then(({ data }) => {
          const counts = {
            draft: 0,
            sent: 0,
            paid: 0,
            overdue: 0,
            cancelled: 0,
            refunded: 0
          };

          if (!data) return counts;
          
          // Count invoices by status from the fetched data
          data?.forEach((invoice) => {
            const status = invoice.status as InvoiceStatus;
            if (status in counts) {
              counts[status]++;
            }
          });
          
          return counts;
        });

      if (countError) throw countError;
      setCounts(countData);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  return {
    invoices,
    loading,
    error,
    counts,
    refresh: fetchInvoices,
  };
}