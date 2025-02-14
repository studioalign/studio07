import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Studio {
  id: string;
  name: string;
}

export function useStudios() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudios() {
      try {
        const { data, error: fetchError } = await supabase
          .from('studios')
          .select('id, name')
          .order('name');

        if (fetchError) throw fetchError;

        setStudios(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch studios');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudios();
  }, []);

  return { studios, isLoading, error };
}