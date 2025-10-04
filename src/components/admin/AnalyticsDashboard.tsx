import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, scoresRes] = await Promise.all([
        supabase.from('essay_analytics').select('*'),
        supabase.from('essay_scores').select('*')
      ]);

      if (analyticsRes.error) throw analyticsRes.error;
      if (scoresRes.error) throw scoresRes.error;

      setAnalytics(analyticsRes.data || []);
      setScores(scoresRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-analytics');
      
      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Analytics exported successfully");
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error("Failed to export analytics");
    }
  };

  const totalSuggestions = analytics.length;
  const appliedCount = analytics.filter(a => a.action === 'applied').length;
  const dismissedCount = analytics.filter(a => a.action === 'dismissed').length;
  const acceptanceRate = totalSuggestions > 0 ? ((appliedCount / totalSuggestions) * 100).toFixed(1) : '0';

  const avgScores = scores.reduce((acc, score) => ({
    overall: acc.overall + (score.overall_score || 0),
    clarity: acc.clarity + (score.clarity_score || 0),
    impact: acc.impact + (score.impact_score || 0),
    authenticity: acc.authenticity + (score.authenticity_score || 0),
    coherence: acc.coherence + (score.coherence_score || 0),
  }), { overall: 0, clarity: 0, impact: 0, authenticity: 0, coherence: 0 });

  const scoreCount = scores.length || 1;
  Object.keys(avgScores).forEach(key => {
    avgScores[key] = Math.round(avgScores[key] / scoreCount);
  });

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">Analytics Dashboard</h2>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Suggestions</h3>
          <p className="text-3xl font-bold">{totalSuggestions}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Applied</h3>
          <p className="text-3xl font-bold text-green-600">{appliedCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Dismissed</h3>
          <p className="text-3xl font-bold text-red-600">{dismissedCount}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Acceptance Rate</h3>
          <p className="text-3xl font-bold">{acceptanceRate}%</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Average Essay Scores</h3>
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Overall</p>
            <p className="text-2xl font-bold">{avgScores.overall}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Clarity</p>
            <p className="text-2xl font-bold">{avgScores.clarity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Impact</p>
            <p className="text-2xl font-bold">{avgScores.impact}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Authenticity</p>
            <p className="text-2xl font-bold">{avgScores.authenticity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Coherence</p>
            <p className="text-2xl font-bold">{avgScores.coherence}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Suggestion Breakdown by Type</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {['critical', 'enhancement', 'personalization'].map(type => {
            const typeCount = analytics.filter(a => a.suggestion_type === type).length;
            const typeApplied = analytics.filter(a => a.suggestion_type === type && a.action === 'applied').length;
            const typeRate = typeCount > 0 ? ((typeApplied / typeCount) * 100).toFixed(1) : '0';
            
            return (
              <div key={type}>
                <p className="text-sm text-muted-foreground mb-1 capitalize">{type}</p>
                <p className="text-xl font-bold">{typeCount} total</p>
                <p className="text-sm text-muted-foreground">{typeRate}% accepted</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
