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

      // Validate against normalized content and map to original indices
      const normalizedContent = normalizeClient(content);
      const normalizedOriginal = normalizeClient(originalText);
      const currentNormalized = normalizedContent.substring(start, end);

      if (currentNormalized !== normalizedOriginal) {
        toast.error('Cannot apply suggestion - the text has changed');
        return;
      }

      // Find the actual original indices corresponding to the normalized range
      const targetStartNorm = start;
      const targetEndNorm = end;

      // Helper: binary search approximate original start based on normalized prefix length
      const normalizedPrefixLenAt = (idx: number) => normalizeClient(content.substring(0, idx)).length;
      let lo = 0, hi = content.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const len = normalizedPrefixLenAt(mid);
        if (len < targetStartNorm) lo = mid + 1; else hi = mid;
      }
      const approxStart = Math.max(0, Math.min(content.length, lo));

      // Search a small window around the approximate start to find exact span by normalization
      const windowRadius = 80;
      const windowStart = Math.max(0, approxStart - windowRadius);
      const windowEnd = Math.min(content.length, approxStart + windowRadius);

      let actualStart = -1;
      let actualEnd = -1;
      outer: for (let i = windowStart; i <= windowEnd; i++) {
        // Expand end index until we match the normalized target segment
        const maxSegment = Math.min(content.length, i + Math.max(normalizedOriginal.length * 3, 64));
        for (let j = i + 1; j <= maxSegment; j++) {
          const segNorm = normalizeClient(content.substring(i, j));
          if (segNorm === normalizedOriginal) {
            actualStart = i;
            actualEnd = j;
            break outer;
          }
          // Early stop if we've already exceeded expected normalized length by a lot
          if (segNorm.length > normalizedOriginal.length + 8 && !normalizedOriginal.startsWith(segNorm)) {
            break;
          }
        }
      }

      if (actualStart === -1) {
        toast.error('Cannot apply suggestion - the text has changed');
        return;
      }

      // Apply the replacement on the original (unnormalized) content
      const newContent =
        content.substring(0, actualStart) +
        suggestedText +
        content.substring(actualEnd);

      setContent(newContent);
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));

      // Adjust subsequent suggestions based on normalized length difference
      const normalizedDiff = normalizeClient(suggestedText).length - (targetEndNorm - targetStartNorm);

      if (normalizedDiff !== 0) {
        const updatedSuggestions = suggestions.map(s => {
          if (s.id === suggestion.id) return s;
          // Only adjust suggestions that start after the current normalized end position
          if (s.location.start >= targetEndNorm) {
            return {
              ...s,
              location: {
                start: s.location.start + normalizedDiff,
                end: s.location.end + normalizedDiff
              }
            };
          }
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
