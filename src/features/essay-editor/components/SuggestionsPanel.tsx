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
  onApply: (suggestion: any) => void;
  onSuggestionsUpdate: (suggestions: any[]) => void;
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
}: SuggestionsPanelProps) => {
  return (
    <div className="space-y-4">
      <EssayScoreCard 
        essayId={essayId}
        content={content}
        collegeId={collegeId}
        programmeId={programmeId}
        cvData={cvData}
        englishVariant={englishVariant}
      />
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
      />
    </div>
  );
};
