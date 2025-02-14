import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RecurringPayment {
  id: string;
  student: {
    id: string;
    name: string;
  };
  plan: {
    id: string;
    name: string;
    amount: number;
    interval: string;
  };
  status: string;
  start_date: string;
  end_date: string | null;
  next_payment_date: string | null;
}

export function useRecurringPayments() {
  const { profile } = useAuth();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    fetchRecurringPayments();
  }, [profile?.id]);

  const fetchRecurringPayments = async () => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!parentData) return;

      const { data, error: fetchError } = await supabase
        .from('plan_enrollments')
        .select(`
          id,
          status,
          start_date,
          end_date,
          student:students (
            id,
            name
          ),
          plan:pricing_plans (
            id,
            name,
            amount,
            interval
          ),
          payment_schedules (
            due_date,
            status
          )
        `)
        .eq('student.parent_id', parentData.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to include next payment date
      const transformedData = (data || []).map(enrollment => ({
        ...enrollment,
        next_payment_date: enrollment.payment_schedules
          ?.filter(schedule => schedule.status === 'pending')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
          ?.due_date || null
      }));

      setRecurringPayments(transformedData);
    } catch (err) {
      console.error('Error fetching recurring payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recurring payments');
    } finally {
      setLoading(false);
    }
  };

  const deleteRecurringPayment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this recurring payment?')) return;

    try {
      const { error: updateError } = await supabase
        .from('plan_enrollments')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Cancel all pending payment schedules
      const { error: scheduleError } = await supabase
        .from('payment_schedules')
        .update({ status: 'cancelled' })
        .eq('plan_enrollment_id', id)
        .eq('status', 'pending');

      if (scheduleError) throw scheduleError;

      fetchRecurringPayments();
    } catch (err) {
      console.error('Error deleting recurring payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete recurring payment');
    }
  };

  return {
    recurringPayments,
    loading,
    error,
    deleteRecurringPayment,
    refresh: fetchRecurringPayments,
  };
}