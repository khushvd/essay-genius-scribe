// Hook for fetching and managing essay data
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { essaysService } from '@/services/essays.service';
import { toast } from 'sonner';
import type { Essay } from '@/types/entities';

export const useEssayData = (essayId: string | undefined) => {
  const navigate = useNavigate();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEssay = async () => {
      if (!essayId) {
        setError('No essay ID provided');
        setLoading(false);
        return;
      }

      const result = await essaysService.getEssay(essayId);

      if (!result.success) {
        toast.error('Essay not found');
        navigate('/dashboard');
        return;
      }

      setEssay(result.data);
      setLoading(false);
    };

    fetchEssay();
  }, [essayId, navigate]);

  return { essay, loading, error };
};
