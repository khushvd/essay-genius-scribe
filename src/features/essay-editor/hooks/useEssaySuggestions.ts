// Hook for managing essay suggestions state
import { useState, useCallback } from 'react';
import { analyticsService } from '@/services/analytics.service';
import { toast } from 'sonner';
import type { EssaySuggestion } from '@/types/entities';

interface UseEssaySuggestionsResult {
  suggestions: EssaySuggestion[];
  appliedSuggestions: Set<string>;
  setSuggestions: (suggestions: EssaySuggestion[]) => void;
  applySuggestion: (suggestion: EssaySuggestion, content: string, setContent: (content: string) => void) => boolean;
  dismissSuggestion: (suggestionId: string) => void;
}

export const useEssaySuggestions = (essayId: string): UseEssaySuggestionsResult => {
  const [suggestions, setSuggestions] = useState<EssaySuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const applySuggestion = useCallback((
    suggestion: EssaySuggestion,
    content: string,
    setContent: (content: string) => void
  ): boolean => {
    try {
      const { originalText, suggestion: suggestedText, contextBefore, contextAfter } = suggestion;

      // Build search pattern: contextBefore + originalText + contextAfter
      const searchPattern = contextBefore + originalText + contextAfter;
      
      // Find the text in current content
      const patternIndex = content.indexOf(searchPattern);
      
      if (patternIndex === -1) {
        // Text not found - silently remove the suggestion (Grammarly-style)
        console.log(`Suggestion ${suggestion.id} no longer applicable - text changed`);
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        return false;
      }

      // Calculate exact positions
      const startIndex = patternIndex + contextBefore.length;
      const endIndex = startIndex + originalText.length;

      // Apply the replacement
      const newContent =
        content.substring(0, startIndex) +
        suggestedText +
        content.substring(endIndex);

      setContent(newContent);
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));

      // Remove the applied suggestion from the list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

      // Track analytics
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
      return true;
    } catch (error) {
      console.error('Error applying suggestion:', error);
      // Silently remove problematic suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      return false;
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
