import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";

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

interface EditorHighlighterProps {
  content: string;
  suggestions: Suggestion[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestionId: string) => void;
  appliedSuggestions: Set<string>;
}

interface HighlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  suggestion: Suggestion;
}

const EditorHighlighter = ({
  content,
  suggestions,
  textareaRef,
  onApply,
  onDismiss,
  appliedSuggestions,
}: EditorHighlighterProps) => {
  const [highlightPositions, setHighlightPositions] = useState<HighlightPosition[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textareaRef.current || suggestions.length === 0) {
      setHighlightPositions([]);
      return;
    }

    const textarea = textareaRef.current;
    const positions: HighlightPosition[] = [];

    // Create a mirror div to calculate text positions
    const mirror = document.createElement('div');
    const computed = window.getComputedStyle(textarea);
    
    // Copy styles from textarea to mirror
    ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 
     'padding', 'border', 'white-space', 'word-wrap'].forEach(prop => {
      mirror.style[prop as any] = computed[prop as any];
    });
    
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.height = 'auto';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    document.body.appendChild(mirror);

    suggestions.forEach(suggestion => {
      if (appliedSuggestions.has(suggestion.id)) return;

      const { start, end } = suggestion.location;
      
      // Validate bounds
      if (start < 0 || end > content.length || start >= end) {
        console.warn('Invalid suggestion bounds:', suggestion);
        return;
      }

      // Calculate position by rendering text before the highlight
      const textBefore = content.substring(0, start);
      const highlightText = content.substring(start, end);
      
      mirror.textContent = textBefore;
      const beforeHeight = mirror.scrollHeight;
      
      mirror.textContent = textBefore + highlightText;
      const afterHeight = mirror.scrollHeight;
      
      // Get the last line position
      const range = document.createRange();
      mirror.textContent = textBefore;
      if (mirror.firstChild) {
        range.setStart(mirror.firstChild, Math.min(textBefore.length, mirror.textContent.length));
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        
        positions.push({
          top: beforeHeight - textarea.scrollTop,
          left: rect.left - textareaRect.left,
          width: highlightText.length * 8, // Approximate width
          height: afterHeight - beforeHeight || 20,
          suggestion,
        });
      }
    });

    document.body.removeChild(mirror);
    setHighlightPositions(positions);
  }, [content, suggestions, textareaRef, appliedSuggestions]);

  const handleHighlightClick = (suggestion: Suggestion, top: number, left: number) => {
    setSelectedSuggestion(suggestion);
    setCardPosition({ top: top + 25, left });
  };

  const handleApplyClick = () => {
    if (selectedSuggestion) {
      onApply(selectedSuggestion);
      setSelectedSuggestion(null);
      setCardPosition(null);
    }
  };

  const handleDismissClick = () => {
    if (selectedSuggestion) {
      onDismiss(selectedSuggestion.id);
      setSelectedSuggestion(null);
      setCardPosition(null);
    }
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'rgba(239, 68, 68, 0.3)'; // red
      case 'enhancement':
        return 'rgba(245, 158, 11, 0.3)'; // amber
      case 'personalization':
        return 'rgba(34, 197, 94, 0.3)'; // green
      default:
        return 'rgba(156, 163, 175, 0.3)'; // gray
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'critical':
        return '#ef4444';
      case 'enhancement':
        return '#f59e0b';
      case 'personalization':
        return '#22c55e';
      default:
        return '#9ca3af';
    }
  };

  return (
    <>
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {highlightPositions.map((pos, idx) => (
          <div
            key={`${pos.suggestion.id}-${idx}`}
            className="absolute pointer-events-auto cursor-pointer transition-all hover:opacity-80"
            style={{
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              height: `${pos.height}px`,
              backgroundColor: getHighlightColor(pos.suggestion.type),
              borderBottom: `2px solid ${getBorderColor(pos.suggestion.type)}`,
            }}
            onClick={() => handleHighlightClick(pos.suggestion, pos.top, pos.left)}
          />
        ))}
      </div>

      {selectedSuggestion && cardPosition && (
        <Card
          className="absolute z-50 p-4 w-80 shadow-lg"
          style={{
            top: `${cardPosition.top}px`,
            left: `${cardPosition.left}px`,
          }}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{selectedSuggestion.issue}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedSuggestion.type}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setSelectedSuggestion(null);
                  setCardPosition(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Original:</p>
                <p className="text-sm text-foreground">{selectedSuggestion.originalText}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Suggested:</p>
                <p className="text-sm text-foreground">{selectedSuggestion.suggestion}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApplyClick}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismissClick}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{selectedSuggestion.reasoning}</p>
          </div>
        </Card>
      )}
    </>
  );
};

export default EditorHighlighter;
