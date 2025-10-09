// Hook for managing essay suggestions state
import { useState, useCallback } from 'react';
import { analyticsService } from '@/services/analytics.service';
import { toast } from 'sonner';
import type { EssaySuggestion } from '@/types/entities';

// Normalize text to handle Unicode differences (mirrors server normalization)
const normalizeClient = (text: string): string => {
  return text
    .normalize('NFD').normalize('NFC')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/\.\.\.\./g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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

      // Validate that the original text still exists at the specified location (with normalization)
      const currentText = content.substring(start, end);
      
      // Use normalized comparison to handle Unicode differences
      if (normalizeClient(currentText) !== normalizeClient(originalText)) {
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

      // Calculate length difference and adjust subsequent suggestions
      const lengthDiff = suggestedText.length - originalText.length;
      
      if (lengthDiff !== 0) {
        const updatedSuggestions = suggestions.map(s => {
          // Skip the suggestion we just applied
          if (s.id === suggestion.id) return s;
          
          // Only adjust suggestions that start after the current suggestion's end position
          if (s.location.start >= end) {
            return {
              ...s,
              location: {
                start: s.location.start + lengthDiff,
                end: s.location.end + lengthDiff
              }
            };
          }
          
          // Keep suggestions before or overlapping unchanged
          return s;
        });
        
        setSuggestions(updatedSuggestions);
      }

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
  }, [essayId, suggestions]);

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
