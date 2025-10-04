import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

interface EssayDetailViewProps {
  essay: any;
  onBack: () => void;
}

export const EssayDetailView = ({ essay, onBack }: EssayDetailViewProps) => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEssayData();
  }, [essay.id]);

  const fetchEssayData = async () => {
    try {
      const [analyticsRes, scoresRes] = await Promise.all([
        supabase
          .from('essay_analytics')
          .select('*')
          .eq('essay_id', essay.id)
          .order('action_timestamp', { ascending: false }),
        supabase
          .from('essay_scores')
          .select('*')
          .eq('essay_id', essay.id)
          .order('scored_at', { ascending: true })
      ]);

      if (analyticsRes.error) throw analyticsRes.error;
      if (scoresRes.error) throw scoresRes.error;

      setAnalytics(analyticsRes.data || []);
      setScores(scoresRes.data || []);
    } catch (error) {
      console.error('Error fetching essay data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSuggestions = analytics.length;
  const appliedCount = analytics.filter(a => a.action === 'applied').length;
  const acceptanceRate = totalSuggestions > 0 ? ((appliedCount / totalSuggestions) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold font-serif">{essay.title || "Untitled Essay"}</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Suggestions</h3>
          <p className="text-3xl font-bold">{totalSuggestions}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Applied</h3>
          <p className="text-3xl font-bold text-green-600">{appliedCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Acceptance Rate</h3>
          <p className="text-3xl font-bold">{acceptanceRate}%</p>
        </Card>
      </div>

      {scores.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Score History</h3>
          <div className="space-y-4">
            {scores.map((score, idx) => (
              <div key={score.id}>
                {idx > 0 && <Separator className="my-4" />}
                <div className="grid md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                    <p className="font-medium capitalize">{score.score_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Overall</p>
                    <p className="text-xl font-bold">{score.overall_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clarity</p>
                    <p className="text-xl font-bold">{score.clarity_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Impact</p>
                    <p className="text-xl font-bold">{score.impact_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Authenticity</p>
                    <p className="text-xl font-bold">{score.authenticity_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Coherence</p>
                    <p className="text-xl font-bold">{score.coherence_score}</p>
                  </div>
                </div>
                {score.ai_reasoning && (
                  <p className="text-sm text-muted-foreground mt-2">{score.ai_reasoning}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Essay Content</h3>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{essay.content}</p>
        </div>
      </Card>

      {analytics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Interaction Timeline</h3>
          <div className="space-y-4">
            {analytics.map((item) => (
              <div key={item.id} className="border-l-2 border-border pl-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{item.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.action_timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Type: <span className="capitalize">{item.suggestion_type}</span>
                </p>
                {item.original_text && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Original:</span> {item.original_text}
                  </p>
                )}
                {item.suggested_text && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Suggested:</span> {item.suggested_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
