import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import SuggestionBadge from "./SuggestionBadge";

interface Suggestion {
  id: string;
  type: "critical" | "enhancement" | "personalization";
  originalText: string;
  issue: string;
  suggestion: string;
  reasoning: string;
  evidence: string;
  contextBefore: string;
  contextAfter: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestionId: string) => void;
  isApplied: boolean;
}

const SuggestionCard = ({ suggestion, onApply, onDismiss, isApplied }: SuggestionCardProps) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(suggestion.id), 200);
  };

  const handleApply = () => {
    setIsExiting(true);
    setTimeout(() => onApply(suggestion), 200);
  };

  return (
    <Card
      className={`p-4 border-l-4 transition-all duration-200 ${
        isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      } ${
        suggestion.type === "critical"
          ? "border-l-destructive"
          : suggestion.type === "enhancement"
          ? "border-l-amber-500"
          : "border-l-green-500"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <SuggestionBadge type={suggestion.type} />
          <div className="flex gap-1">
            {!isApplied && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleApply}
                className="h-7 px-2"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Original:</p>
          <p className="text-sm bg-muted/50 p-2 rounded italic">"{suggestion.originalText}"</p>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-1">{suggestion.issue}</p>
          <p className="text-sm bg-primary/5 p-2 rounded border border-primary/10">
            {suggestion.suggestion}
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1.5">
          <p className="line-clamp-3">
            <span className="font-semibold">Why:</span> {suggestion.reasoning}
          </p>
          {suggestion.evidence && (
            <p className="line-clamp-2">
              <span className="font-semibold">Evidence:</span> {suggestion.evidence}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SuggestionCard;
