import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FileEdit, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SuggestionCard from "./SuggestionCard";

interface Suggestion {
  id: string;
  type: "critical" | "enhancement" | "personalization";
  location: { start: number; end: number };
  originalText: string;
  issue: string;
  suggestion: string;
  reasoning: string;
  evidence: string;
}

interface EditorSuggestionsProps {
  essayId: string;
  content: string;
  collegeId: string;
  programmeId: string;
  cvData: any;
  englishVariant: "british" | "american";
  onApplySuggestion: (suggestion: Suggestion) => void;
  collegeName?: string;
  programmeName?: string;
  onSuggestionsUpdate?: (suggestions: Suggestion[]) => void;
}

const EditorSuggestions = ({
  essayId,
  content,
  collegeId,
  programmeId,
  cvData,
  englishVariant,
  onApplySuggestion,
  collegeName,
  programmeName,
  onSuggestionsUpdate,
}: EditorSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisId, setAnalysisId] = useState<string>("");
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);

  // Auto-analyze with delay and retry logic
  useEffect(() => {
    if (!essayId || !content.trim() || content.length < 50 || hasAnalyzed) {
      return;
    }

    // Add 2-second delay to ensure essay data is loaded
    const timer = setTimeout(() => {
      handleAnalyze();
    }, 2000);

    return () => clearTimeout(timer);
  }, [essayId, content, hasAnalyzed]);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    // Prevent multiple requests within 10 seconds
    const now = Date.now();
    if (now - lastAnalysisTime < 10000) {
      toast.error("Analysis in progress. Please wait a moment.");
      return;
    }

    setAnalyzing(true);
    setSuggestions([]);
    setAppliedSuggestions(new Set());
    setLastAnalysisTime(now);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-essay', {
        body: {
          essayId,
          content,
          collegeId,
          programmeId,
          cvData,
          englishVariant,
          mode: 'feedback', // Only get feedback, not score
        },
      });

      if (error) {
        if (error.message.includes('Essay not found')) {
          toast.error("Essay not found. Redirecting to dashboard...");
          setTimeout(() => window.location.href = '/dashboard', 2000);
        } else if (error.message.includes('Rate limit')) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (error.message.includes('credits')) {
          toast.error("Editorial feedback requires additional credits.");
        } else {
          toast.error("Unable to analyze essay. Please try again.");
        }
        console.error('Analysis error:', error);
        return;
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        onSuggestionsUpdate?.(data.suggestions);
        setAnalysisId(data.analysisId || `analysis-${Date.now()}`);
        toast.success(`Found ${data.suggestions.length} editorial suggestions`);
      } else {
        toast.success("Your essay looks great! No critical feedback at this time.");
      }
      setHasAnalyzed(true);
    } catch (err) {
      console.error('Error calling analyze-essay:', err);
      toast.error("Failed to analyze essay. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async (suggestion: Suggestion) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]));
    toast.success("Suggestion applied");

    // Track analytics
    await trackSuggestionAction(suggestion, 'applied');
  };

  const handleDismiss = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      await trackSuggestionAction(suggestion, 'dismissed');
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  const trackSuggestionAction = async (suggestion: Suggestion, action: 'applied' | 'dismissed' | 'ignored') => {
    try {
      await supabase.functions.invoke('track-essay-analytics', {
        body: {
          essayId,
          analysisId,
          suggestionId: suggestion.id,
          suggestionType: suggestion.type,
          action,
          originalText: suggestion.originalText,
          suggestedText: suggestion.suggestion,
          reasoning: suggestion.reasoning
        }
      });
    } catch (error) {
      console.error('Error tracking analytics:', error);
      // Don't show error to user, this is background tracking
    }
  };

  const groupedSuggestions = {
    critical: suggestions.filter((s) => s.type === "critical"),
    enhancement: suggestions.filter((s) => s.type === "enhancement"),
    personalization: suggestions.filter((s) => s.type === "personalization"),
  };

  const feedbackMode = collegeId && programmeId 
    ? `Personalized for ${collegeName}${programmeName ? ` - ${programmeName}` : ''}` 
    : "Generic feedback mode";

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Editorial Feedback</h2>
          </div>
          {hasAnalyzed && !analyzing && (
            <Button
              onClick={handleAnalyze}
              disabled={!content.trim() || content.length < 50}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {collegeId && programmeId ? '✓' : '⚠️'} {feedbackMode}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {analyzing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing with AI...</span>
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          
          {suggestions.length === 0 && !analyzing && hasAnalyzed && (
            <div className="text-center py-8 text-muted-foreground">
              <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Your essay looks great! No suggestions at this time.
              </p>
            </div>
          )}
          
          {suggestions.length === 0 && !analyzing && !hasAnalyzed && content.length < 50 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Write at least 50 characters to get {collegeId && programmeId ? 'personalized' : 'generic'} editorial feedback.
              </p>
            </div>
          )}

          {groupedSuggestions.critical.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive"></span>
                Critical ({groupedSuggestions.critical.length})
              </h3>
              <div className="space-y-3">
                {groupedSuggestions.critical.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApply={handleApply}
                    onDismiss={handleDismiss}
                    isApplied={appliedSuggestions.has(suggestion.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedSuggestions.enhancement.length > 0 && (
            <>
              {groupedSuggestions.critical.length > 0 && <Separator />}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Enhancement ({groupedSuggestions.enhancement.length})
                </h3>
                <div className="space-y-3">
                  {groupedSuggestions.enhancement.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      isApplied={appliedSuggestions.has(suggestion.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {groupedSuggestions.personalization.length > 0 && (
            <>
              {(groupedSuggestions.critical.length > 0 || groupedSuggestions.enhancement.length > 0) && <Separator />}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Personalization ({groupedSuggestions.personalization.length})
                </h3>
                <div className="space-y-3">
                  {groupedSuggestions.personalization.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                      isApplied={appliedSuggestions.has(suggestion.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EditorSuggestions;
