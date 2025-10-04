import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileEdit, Loader2 } from "lucide-react";
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
}: EditorSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setAnalyzing(true);
    setSuggestions([]);
    setAppliedSuggestions(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('analyze-essay', {
        body: {
          essayId,
          content,
          collegeId,
          programmeId,
          cvData,
          englishVariant,
        },
      });

      if (error) {
        if (error.message.includes('Rate limit')) {
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
        toast.success(`Found ${data.suggestions.length} editorial suggestions`);
      } else {
        toast.success("Your essay looks great! No critical feedback at this time.");
      }
    } catch (err) {
      console.error('Error calling analyze-essay:', err);
      toast.error("Failed to analyze essay. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]));
    toast.success("Suggestion applied");
  };

  const handleDismiss = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
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
        <div className="flex items-center gap-2 mb-2">
          <FileEdit className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Editorial Feedback</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {collegeId && programmeId ? '✓' : '⚠️'} {feedbackMode}
        </p>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || !content.trim() || content.length < 50}
          className="w-full"
          variant="default"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileEdit className="w-4 h-4 mr-2" />
              Get Editorial Feedback
            </>
          )}
        </Button>
        {content.length < 50 && (
          <p className="text-xs text-muted-foreground mt-2">Write at least 50 characters to get feedback</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {suggestions.length === 0 && !analyzing && (
            <div className="text-center py-8 text-muted-foreground">
              <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Click the button above to get {collegeId && programmeId ? 'personalized' : 'generic'} editorial feedback
                {collegeId && programmeId ? ' based on successful essays' : ''}.
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
