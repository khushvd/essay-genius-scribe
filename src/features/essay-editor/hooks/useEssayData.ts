// Hook for fetching and managing essay data
import { useState, useEffect, useCallback } from 'react';
import { essaysService } from '@/services/essays.service';
import type { Essay } from '@/types/entities';

export const useEssayData = (essayId: string | undefined) => {
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEssay = useCallback(async () => {
    if (!essayId) {
      setError('No essay ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await essaysService.getEssay(essayId);

    if (!result.success) {
      setError(typeof result.error === 'string' ? result.error : 'Failed to load essay');
      setLoading(false);
      return;
    }

    setEssay(result.data);
    setLoading(false);
  }, [essayId]);

  useEffect(() => {
    fetchEssay();
  }, [fetchEssay]);

  return { essay, loading, error, retry: fetchEssay };
};
