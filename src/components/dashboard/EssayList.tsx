import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EssayListProps {
  userId: string;
}

export const EssayList = ({ userId }: EssayListProps) => {
  const [essays, setEssays] = useState<any[]>([]);
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEssays = async () => {
      const { data, error } = await supabase
        .from("essays")
        .select(`
          *,
          colleges (name),
          programmes (name)
        `)
        .eq("writer_id", userId)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setEssays(data);
        
        // Fetch latest scores for all essays
        const essayIds = data.map(e => e.id);
        if (essayIds.length > 0) {
          const { data: scoresData } = await supabase
            .from('essay_scores')
            .select('essay_id, overall_score, scored_at')
            .in('essay_id', essayIds)
            .order('scored_at', { ascending: false });

          if (scoresData) {
            const latestScores: Record<string, number> = {};
            scoresData.forEach(score => {
              if (!latestScores[score.essay_id]) {
                latestScores[score.essay_id] = score.overall_score || 0;
              }
            });
            setEssayScores(latestScores);
          }
        }
      }
      setLoading(false);
    };

    fetchEssays();

    const channel = supabase
      .channel("essays_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "essays",
          filter: `writer_id=eq.${userId}`,
        },
        () => {
          fetchEssays();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (essays.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">No essays yet</p>
          <p className="text-sm text-muted-foreground">Click "New Essay" to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {essays.map((essay) => (
        <Card
          key={essay.id}
          className="cursor-pointer hover:shadow-medium transition-shadow"
          onClick={() => navigate(`/editor/${essay.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg line-clamp-1">{essay.title}</CardTitle>
              <div className="flex items-center gap-2">
                {essayScores[essay.id] && (
                  <Badge 
                    variant={
                      essayScores[essay.id] >= 80 ? "default" : 
                      essayScores[essay.id] >= 60 ? "secondary" : 
                      "outline"
                    }
                  >
                    Score: {essayScores[essay.id]}
                  </Badge>
                )}
                <Badge variant={essay.status === "completed" ? "default" : "secondary"}>
                  {essay.status}
                </Badge>
              </div>
            </div>
            <CardDescription className="line-clamp-1">
              {essay.colleges?.name} • {essay.programmes?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
              {essay.content.substring(0, 150)}...
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(new Date(essay.updated_at), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
