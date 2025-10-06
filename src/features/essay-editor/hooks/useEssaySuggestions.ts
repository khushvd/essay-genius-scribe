// Hook for managing essay suggestions state
import { useState, useCallback } from 'react';
import { analyticsService } from '@/services/analytics.service';
import { toast } from 'sonner';
import type { EssaySuggestion } from '@/types/entities';

interface UseEssaySuggestionsResult {
  suggestions: EssaySuggestion[];
  appliedSuggestions: Set<string>;
  setSuggestions: (suggestions: EssaySuggestion[]) => void;
  applySuggestion: (suggestion: EssaySuggestion, content: string, setContent: (content: string) => void) => void;
  dismissSuggestion: (suggestionId: string) => void;
}

export const useEssaySuggestions = (essayId: string): UseEssaySuggestionsResult => {
  const [suggestions, setSuggestions] = useState<EssaySuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const applySuggestion = useCallback((
    suggestion: EssaySuggestion,
    content: string,
    setContent: (content: string) => void
  ) => {
    try {
      const { start, end } = suggestion.location;
      const { suggestion: suggestedText, originalText } = suggestion;

      // Validate that the original text still exists at the specified location
      const currentText = content.substring(start, end);

      if (currentText !== originalText) {
        toast.error('Cannot apply suggestion - the text has changed');
        return;
      }

      // Apply the replacement
      const newContent =
        content.substring(0, start) +
        suggestedText +
        content.substring(end);

      setContent(newContent);
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));

      // Track the action
      analyticsService.trackSuggestionAction(
        essayId,
        suggestion.id,
        'applied',
        suggestion.type,
        originalText,
        suggestedText,
        suggestion.reasoning
      );

      toast.success('Suggestion applied');
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    }
  }, [essayId]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));
    
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      analyticsService.trackSuggestionAction(
        essayId,
        suggestionId,
        'dismissed',
        suggestion.type,
        suggestion.originalText,
        suggestion.suggestion,
        suggestion.reasoning
      );
    }
  }, [essayId, suggestions]);

  return {
    suggestions,
    appliedSuggestions,
    setSuggestions,
    applySuggestion,
    dismissSuggestion,
  };
};
