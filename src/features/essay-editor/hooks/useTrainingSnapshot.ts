import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseTrainingSnapshotProps {
  essayId: string;
  originalContent: string;
  currentContent: string;
}

export const useTrainingSnapshot = ({ essayId, originalContent, currentContent }: UseTrainingSnapshotProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitForTraining = async () => {
    setIsSubmitting(true);
    try {
      // Fetch analytics data to get suggestions
      const { data: analytics, error: analyticsError } = await supabase
        .from('essay_analytics')
        .select('*')
        .eq('essay_id', essayId);

      if (analyticsError) throw analyticsError;

      // Separate applied and dismissed suggestions
      const suggestionsApplied = analytics?.filter(a => a.action === 'applied') || [];
      const suggestionsDismissed = analytics?.filter(a => a.action === 'dismissed') || [];

      // Detect manual edits (simplified - differences not from suggestions)
      const manualEdits: any[] = [];
      if (originalContent !== currentContent && suggestionsApplied.length === 0) {
        manualEdits.push({
          type: 'manual_edit',
          timestamp: new Date().toISOString(),
          note: 'Content changed manually by user'
        });
      }

      // Call edge function to create snapshot
      const { data, error } = await supabase.functions.invoke('create-training-snapshot', {
        body: {
          essayId,
          originalContent,
          finalContent: currentContent,
          suggestionsApplied,
          suggestionsDismissed,
          manualEdits
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Essay submitted for training review. Thank you for contributing!",
      });

      return true;
    } catch (error: any) {
      console.error('Error submitting for training:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit essay for training",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForTraining,
    isSubmitting
  };
};
