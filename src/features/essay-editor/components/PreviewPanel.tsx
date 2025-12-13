import { EditorPreview } from '@/components/editor/EditorPreview';

interface PreviewPanelProps {
  content: string;
  suggestions: any[];
  appliedSuggestions: Set<string>;
  onApply: (suggestion: any) => void;
  onDismiss: (suggestionId: string) => void;
}

export const PreviewPanel = ({
  content,
  suggestions,
  appliedSuggestions,
  onApply,
  onDismiss,
}: PreviewPanelProps) => {
  return (
    <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden flex flex-col h-full min-h-[400px] max-h-[70vh]">
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-sm font-medium text-muted-foreground">Preview with Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">Click on highlighted text to see suggestions</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorPreview
          content={content}
          suggestions={suggestions}
          appliedSuggestions={appliedSuggestions}
          onApply={onApply}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
};
