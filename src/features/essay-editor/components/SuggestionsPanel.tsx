import { EssayScoreCard } from '@/components/editor/EssayScoreCard';
import EditorSuggestions from '@/components/editor/EditorSuggestions';

interface SuggestionsPanelProps {
  suggestions: any[];
  essayId: string;
  content: string;
  collegeId: string | null;
  programmeId: string | null;
  cvData: any;
  englishVariant: 'american' | 'british';
  collegeName?: string;
  programmeName?: string;
  onApply: (suggestion: any) => boolean;
  onSuggestionsUpdate: (suggestions: any[]) => void;
  appliedSuggestions: Set<string>;
}

export const SuggestionsPanel = ({
  suggestions,
  essayId,
  content,
  collegeId,
  programmeId,
  cvData,
  englishVariant,
  collegeName,
  programmeName,
  onApply,
  onSuggestionsUpdate,
  appliedSuggestions,
}: SuggestionsPanelProps) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Score card - fixed at top */}
      <div className="shrink-0 p-4 border-b border-border">
        <EssayScoreCard 
          essayId={essayId}
          content={content}
          collegeId={collegeId}
          programmeId={programmeId}
          cvData={cvData}
          englishVariant={englishVariant}
        />
      </div>
      
      {/* Suggestions - scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorSuggestions
          suggestions={suggestions}
          essayId={essayId}
          content={content}
          collegeId={collegeId}
          programmeId={programmeId}
          cvData={cvData}
          englishVariant={englishVariant}
          onApplySuggestion={onApply}
          collegeName={collegeName}
          programmeName={programmeName}
          onSuggestionsUpdate={onSuggestionsUpdate}
          appliedSuggestions={appliedSuggestions}
        />
      </div>
    </div>
  );
};
