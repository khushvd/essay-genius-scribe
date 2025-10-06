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
    <div className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground">Preview with Suggestions</h3>
        <p className="text-xs text-muted-foreground mt-1">Click on highlighted text to see suggestions</p>
      </div>
      <div className="h-[500px]">
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
