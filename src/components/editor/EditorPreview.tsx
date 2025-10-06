import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Suggestion {
  id: string;
  type: "critical" | "enhancement" | "personalization";
  location: { start: number; end: number };
  originalText: string;
  issue: string;
  suggestion: string;
  reasoning: string;
}

interface EditorPreviewProps {
  content: string;
  suggestions: Suggestion[];
  appliedSuggestions: Set<string>;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

export const EditorPreview = ({ 
  content, 
  suggestions, 
  appliedSuggestions,
  onApply, 
  onDismiss 
}: EditorPreviewProps) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  const getHighlightColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-200 dark:bg-red-900/40 border-b-2 border-red-500";
      case "enhancement":
        return "bg-amber-200 dark:bg-amber-900/40 border-b-2 border-amber-500";
      case "personalization":
        return "bg-green-200 dark:bg-green-900/40 border-b-2 border-green-500";
      default:
        return "bg-gray-200 dark:bg-gray-700";
    }
  };

  const renderContentWithHighlights = useMemo(() => {
    if (!content || suggestions.length === 0) {
      return <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{content}</p>;
    }

    const activeSuggestions = suggestions.filter(s => !appliedSuggestions.has(s.id));
    if (activeSuggestions.length === 0) {
      return <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{content}</p>;
    }

    const sortedSuggestions = [...activeSuggestions].sort((a, b) => a.location.start - b.location.start);
    
    const result: JSX.Element[] = [];
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion, idx) => {
      const start = suggestion.location.start;
      const end = suggestion.location.end;

      if (start < 0 || end > content.length || start >= end) return;

      // Add text before highlight
      if (lastIndex < start) {
        result.push(
          <span key={`text-${idx}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex, start)}
          </span>
        );
      }

      // Add highlighted text
      result.push(
        <mark
          key={`mark-${idx}`}
          className={cn(
            "cursor-pointer transition-all hover:opacity-80 rounded px-0.5",
            getHighlightColor(suggestion.type),
            selectedSuggestion?.id === suggestion.id && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedSuggestion(suggestion)}
        >
          {content.substring(start, end)}
        </mark>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end" className="whitespace-pre-wrap">
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <div className="font-mono text-sm leading-relaxed">{result}</div>;
  }, [content, suggestions, appliedSuggestions, selectedSuggestion]);

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full">
      <div className="p-4">
        {renderContentWithHighlights}
      </div>
      </ScrollArea>

      {selectedSuggestion && (
        <Card className="absolute top-4 right-4 max-w-sm p-4 shadow-lg border-2 z-10">
          <div className="flex items-start justify-between mb-3">
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              selectedSuggestion.type === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
              selectedSuggestion.type === "enhancement" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              selectedSuggestion.type === "personalization" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            )}>
              {selectedSuggestion.type}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedSuggestion(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Original:</p>
              <p className="text-foreground/80 italic">"{selectedSuggestion.originalText}"</p>
            </div>

            <div>
              <p className="font-semibold text-muted-foreground mb-1">Suggested:</p>
              <p className="text-foreground font-medium">"{selectedSuggestion.suggestion}"</p>
            </div>

            <div>
              <p className="font-semibold text-muted-foreground mb-1">Reasoning:</p>
              <p className="text-foreground/80">{selectedSuggestion.reasoning}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                onApply(selectedSuggestion);
                setSelectedSuggestion(null);
              }}
              className="flex-1"
              size="sm"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onDismiss(selectedSuggestion.id);
                setSelectedSuggestion(null);
              }}
              className="flex-1"
              size="sm"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
