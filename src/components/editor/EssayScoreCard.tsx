import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, Award, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface EssayScoreCardProps {
  essayId: string;
  content: string;
  collegeId: string | null;
  programmeId: string | null;
  cvData: any;
  englishVariant: 'american' | 'british';
  onScoreUpdate?: () => void;
}

export const EssayScoreCard = ({ essayId, content, collegeId, programmeId, cvData, englishVariant, onScoreUpdate }: EssayScoreCardProps) => {
  const [latestScore, setLatestScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const fetchLatestScore = async () => {
    const { data, error } = await supabase
      .from('essay_scores')
      .select('*')
      .eq('essay_id', essayId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setLatestScore(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLatestScore();

    // Subscribe to score updates
    const channel = supabase
      .channel(`essay_scores_${essayId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'essay_scores',
          filter: `essay_id=eq.${essayId}`,
        },
        () => {
          fetchLatestScore();
          onScoreUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [essayId]);

  const handleGenerateScore = async () => {
    if (!content.trim() || content.length < 50) {
      toast.error("Write at least 50 characters to get a score");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-essay', {
        body: {
          essayId,
          content,
          collegeId,
          programmeId,
          cvData,
          englishVariant,
          mode: 'score', // Only generate score
        },
      });

      if (error) {
        toast.error("Failed to generate score. Please try again.");
        console.error('Score generation error:', error);
        return;
      }

      toast.success("Score generated successfully!");
      // Score will be automatically updated via realtime subscription
    } catch (err) {
      console.error('Error generating score:', err);
      toast.error("Failed to generate score. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!latestScore) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            Essay Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground text-center py-2">
            Generate a score for your essay
          </p>
          <Button 
            onClick={handleGenerateScore} 
            disabled={generating || content.length < 50}
            className="w-full"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Score'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            Essay Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadgeVariant(latestScore.overall_score || 0)}>
              {latestScore.score_type === 'initial' ? 'Initial' : 'After Edits'}
            </Badge>
            <Button 
              onClick={handleGenerateScore} 
              disabled={generating}
              variant="ghost"
              size="sm"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-score'}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Last scored {new Date(latestScore.scored_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <button
            onClick={() => setReasoningExpanded(!reasoningExpanded)}
            className={`text-4xl font-bold ${getScoreColor(latestScore.overall_score || 0)} cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center gap-2 mx-auto`}
          >
            {latestScore.overall_score || 0}
            {latestScore.ai_reasoning && (
              reasoningExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-1">Overall Score {latestScore.ai_reasoning && '(click to expand)'}</p>
        </div>

        {latestScore.clarity_score && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Clarity</span>
              <span className="font-medium">{latestScore.clarity_score}/100</span>
            </div>
            <Progress value={latestScore.clarity_score} className="h-1.5" />
          </div>
        )}

        {latestScore.impact_score && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Impact</span>
              <span className="font-medium">{latestScore.impact_score}/100</span>
            </div>
            <Progress value={latestScore.impact_score} className="h-1.5" />
          </div>
        )}

        {latestScore.authenticity_score && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Authenticity</span>
              <span className="font-medium">{latestScore.authenticity_score}/100</span>
            </div>
            <Progress value={latestScore.authenticity_score} className="h-1.5" />
          </div>
        )}

        {latestScore.coherence_score && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Coherence</span>
              <span className="font-medium">{latestScore.coherence_score}/100</span>
            </div>
            <Progress value={latestScore.coherence_score} className="h-1.5" />
          </div>
        )}

        {latestScore.ai_reasoning && reasoningExpanded && (
          <div className="pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{latestScore.ai_reasoning}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
          <TrendingUp className="w-3 h-3" />
          <span>Keep editing to improve your score</span>
        </div>
      </CardContent>
    </Card>
  );
};
