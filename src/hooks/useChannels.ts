import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  class_id: string;
  created_at: string;
  updated_at: string;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    const fetchChannels = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('class_channels')
          .select(`
            id,
            name,
            description,
            class_id,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setChannels(data || []);
      } catch (err) {
        console.error('Error fetching channels:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch channels');
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();

    // Subscribe to channel updates
    const subscription = supabase
      .channel('channel_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_channels',
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  return { channels, loading, error };
}