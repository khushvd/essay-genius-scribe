// Hook for managing essay creation form state and submission
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { essaysService } from '@/services/essays.service';
import { essayValidationSchema } from '@/lib/validation/schemas';
import { toast } from 'sonner';

interface QuestionnaireData {
  academicInterests: string;
  extracurriculars: string;
  careerGoals: string;
  challenges: string;
}

interface UseEssayFormResult {
  title: string;
  content: string;
  degreeLevel: 'bachelors' | 'masters';
  questionnaireData: QuestionnaireData;
  loading: boolean;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setDegreeLevel: (level: 'bachelors' | 'masters') => void;
  setQuestionnaireData: (data: QuestionnaireData) => void;
  submitEssay: (params: {
    userId: string;
    collegeId: string | null;
    programmeId: string | null;
    customCollegeName: string | null;
    customProgrammeName: string | null;
    cvText: string;
    questionnaireText: string;
    questionnaireFile: File | null;
  }) => Promise<void>;
}

export const useEssayForm = (): UseEssayFormResult => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<'bachelors' | 'masters'>('bachelors');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    academicInterests: '',
    extracurriculars: '',
    careerGoals: '',
    challenges: '',
  });
  const [loading, setLoading] = useState(false);

  const submitEssay = async (params: {
    userId: string;
    collegeId: string | null;
    programmeId: string | null;
    customCollegeName: string | null;
    customProgrammeName: string | null;
    cvText: string;
    questionnaireText: string;
    questionnaireFile: File | null;
  }) => {
    setLoading(true);

    try {
      // Validate essay data
      const parsed = essayValidationSchema.safeParse({
        title: title.trim(),
        content: content.trim(),
        degreeLevel,
        cvText: params.cvText.trim() || undefined,
        questionnaireText: params.questionnaireText.trim() || undefined,
      });

      if (!parsed.success) {
        toast.error(parsed.error.errors[0].message);
        return;
      }

      if (!content.trim()) {
        toast.error('Please provide essay content either by typing or uploading a document.');
        return;
      }

      // Prepare CV data
      const cvData = params.cvText.trim() 
        ? { text: params.cvText, source: 'file' as const } 
        : null;

      // Prepare questionnaire data
      let questionnairePayload = null;
      if (params.questionnaireFile && params.questionnaireText.trim()) {
        questionnairePayload = {
          questionnaireText: params.questionnaireText,
          source: 'file',
          fileName: params.questionnaireFile.name,
        };
      } else {
        const filteredQuestionnaire = Object.entries(questionnaireData).reduce(
          (acc, [key, value]) => {
            if (value.trim()) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        );

        if (Object.keys(filteredQuestionnaire).length > 0) {
          questionnairePayload = { ...filteredQuestionnaire, source: 'manual' };
        }
      }

      const result = await essaysService.createEssay({
        writer_id: params.userId,
        title,
        content,
        degree_level: degreeLevel,
        college_id: params.collegeId,
        programme_id: params.programmeId,
        custom_college_name: params.customCollegeName,
        custom_programme_name: params.customProgrammeName,
        cv_data: cvData as any,
        questionnaire_data: questionnairePayload as any,
        status: 'draft',
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Essay created successfully!');
      navigate(`/editor/${result.data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create essay');
    } finally {
      setLoading(false);
    }
  };

  return {
    title,
    content,
    degreeLevel,
    questionnaireData,
    loading,
    setTitle,
    setContent,
    setDegreeLevel,
    setQuestionnaireData,
    submitEssay,
  };
};
