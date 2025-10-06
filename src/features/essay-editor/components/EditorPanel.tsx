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
    <div className="bg-card rounded-2xl shadow-soft border border-border p-4 md:p-8">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Editor</h3>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[500px] font-mono text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 p-0"
        placeholder="Write your essay here..."
        style={{ backgroundColor: 'transparent' }}
      />
      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
        <span>{content.length} characters</span>
        <span>•</span>
        <span>{wordCount} words</span>
        <span>•</span>
        <Badge variant={hasMinContent ? "secondary" : "outline"}>
          {hasMinContent ? "Ready for feedback" : "Add more content"}
        </Badge>
      </div>
    </div>
  );
};
