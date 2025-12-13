import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface EditorPanelProps {
  content: string;
  onChange: (content: string) => void;
}

export const EditorPanel = ({ content, onChange }: EditorPanelProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const hasMinContent = content.length >= 50;

  return (
    <div className="bg-card rounded-xl shadow-soft border border-border flex flex-col h-full min-h-[400px] max-h-[70vh]">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-medium text-muted-foreground">Editor</h3>
      </div>
      <div className="flex-1 p-4 pt-3 min-h-0 overflow-hidden">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-h-[280px] font-mono text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 p-0 bg-transparent"
          placeholder="Write your essay here..."
        />
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground p-4 pt-0 border-t border-border mt-auto">
        <span>{content.length} characters</span>
        <span className="text-border">•</span>
        <span>{wordCount} words</span>
        <span className="text-border">•</span>
        <Badge variant={hasMinContent ? "secondary" : "outline"}>
          {hasMinContent ? "Ready for feedback" : "Add more content"}
        </Badge>
      </div>
    </div>
  );
};
