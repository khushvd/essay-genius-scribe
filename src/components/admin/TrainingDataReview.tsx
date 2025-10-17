import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrainingEssay {
  id: string;
  essay_id: string;
  status: string;
  added_at: string;
  original_content: string;
  final_content: string;
  before_score: any;
  after_score: any;
  suggestions_applied: any;
  suggestions_dismissed: any;
  manual_edits: any;
  improvement_metrics: any;
  admin_notes: string;
  metadata: any;
  essays?: {
    id?: string;
    title?: string;
    colleges?: { id: string; name: string } | null;
    programmes?: { id: string; name: string } | null;
  };
}

export const TrainingDataReview = () => {
  const [essays, setEssays] = useState<TrainingEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<TrainingEssay | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTrainingEssays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_essays")
      .select(`
        *,
        essays(
          id,
          title,
          colleges(id, name),
          programmes(id, name)
        )
      `)
      .order("added_at", { ascending: false });

    if (error) {
      console.error('Error fetching training data:', error);
      
      // Check for RLS policy errors
      if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
        toast.error("Access denied: You don't have admin permissions. Please contact support.");
      } else {
        toast.error(`Failed to fetch training data: ${error.message}`);
      }
    } else {
      setEssays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrainingEssays();
  }, []);

  const handleAction = async (essayId: string, action: "approve_and_add" | "reject") => {
    setActionLoading(true);
    
    if (action === "approve_and_add") {
      const essay = essays.find(e => e.id === essayId);
      if (!essay) {
        toast.error("Essay not found");
        setActionLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("successful_essays")
        .insert({
          essay_content: essay.final_content,
          essay_title: essay.metadata?.title || "Untitled",
          college_id: essay.metadata?.college_id,
          programme_id: essay.metadata?.programme_id,
          degree_level: essay.metadata?.degree_level,
          writer_resume: essay.metadata?.cv_data,
          writer_questionnaire: essay.metadata?.questionnaire_data,
          performance_score: essay.after_score?.overall_score || 0,
        });

      if (insertError) {
        console.error("Portfolio insert error:", insertError);
        toast.error("Failed to add to portfolio");
        setActionLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("training_essays")
        .update({ status: "approved" })
        .eq("id", essayId);

      if (updateError) {
        console.error("Status update error:", updateError);
        toast.error("Added to portfolio but failed to update status");
      } else {
        toast.success("Approved for training and added to portfolio");
        fetchTrainingEssays();
      }
    } else if (action === "reject") {
      const { error } = await supabase
        .from("training_essays")
        .update({ status: "rejected" })
        .eq("id", essayId);

      if (error) {
        toast.error("Failed to reject training data");
      } else {
        toast.success("Training data rejected");
        fetchTrainingEssays();
      }
    }
    
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge variant="outline">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved & In Portfolio</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateImprovement = (before: any, after: any) => {
    if (!before?.overall_score || !after?.overall_score) return null;
    return after.overall_score - before.overall_score;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif">Training Data Review</h2>
          <p className="text-muted-foreground">Review and manage iterative learning data</p>
        </div>
        <div className="flex gap-2">
          <Card className="px-4 py-2">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{essays.filter(e => e.status === "pending_review").length}</p>
          </Card>
          <Card className="px-4 py-2">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold">{essays.filter(e => e.status === "approved").length}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">All Essays</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedEssay}>Detail View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {essays.map((essay) => {
            const improvement = calculateImprovement(essay.before_score, essay.after_score);
            
            return (
              <Card key={essay.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {essay.essays?.title || essay.metadata?.title || "Untitled Essay"}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(essay.added_at).toLocaleDateString()}</span>
                        <span>• Writer: {essay.metadata?.writer_name || "Unknown"}</span>
                        {improvement !== null && (
                          <Badge variant="outline" className={improvement > 0 ? "text-success" : ""}>
                            {improvement > 0 ? "+" : ""}{improvement} points
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(essay.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEssay(essay)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Suggestions Applied</p>
                      <p className="font-medium">{essay.suggestions_applied?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Manual Edits</p>
                      <p className="font-medium">{essay.manual_edits?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score Change</p>
                      <p className="font-medium">
                        {essay.before_score?.overall_score || 0} → {essay.after_score?.overall_score || 0}
                      </p>
                    </div>
                  </div>
                  {essay.status === "pending_review" && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAction(essay.id, "approve_and_add")}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Add to Portfolio
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(essay.id, "reject")}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="detail">
          {selectedEssay && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl">
                        {selectedEssay.metadata?.title || "Untitled Essay"}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-medium">
                          {selectedEssay.essays?.colleges?.name || "Unknown College"}
                        </span>
                        <span>•</span>
                        <span>{selectedEssay.essays?.programmes?.name || "Unknown Programme"}</span>
                        <span>•</span>
                        <Badge variant="outline">
                          {selectedEssay.metadata?.degree_level || "Unknown Level"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Performance Score</p>
                      <p className="text-3xl font-bold text-primary">
                        {selectedEssay.after_score?.overall_score || 0}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium">Metric</th>
                          <th className="text-center py-2 px-4 font-medium">Before</th>
                          <th className="text-center py-2 px-4 font-medium">After</th>
                          <th className="text-center py-2 px-4 font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['overall_score', 'clarity_score', 'impact_score', 'coherence_score', 'authenticity_score'].map((metric) => {
                          const before = selectedEssay.before_score?.[metric] || 0;
                          const after = selectedEssay.after_score?.[metric] || 0;
                          const change = after - before;
                          const metricLabel = metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          return (
                            <tr key={metric} className="border-b">
                              <td className="py-2 px-4">{metricLabel}</td>
                              <td className="text-center py-2 px-4">{before}</td>
                              <td className="text-center py-2 px-4 font-semibold">{after}</td>
                              <td className="text-center py-2 px-4">
                                <Badge variant={change > 0 ? "default" : change < 0 ? "destructive" : "outline"}>
                                  {change > 0 ? "+" : ""}{change}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {selectedEssay.suggestions_applied?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Applied Suggestions ({selectedEssay.suggestions_applied.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedEssay.suggestions_applied.map((suggestion: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{suggestion.type || "Edit"}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {suggestion.location 
                                ? `Position: ${suggestion.location.start}-${suggestion.location.end}`
                                : suggestion.contextBefore 
                                  ? `Context: "${suggestion.contextBefore.slice(-10)}...${suggestion.contextAfter.slice(0, 10)}"`
                                  : 'Context-based suggestion'
                              }
                            </span>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
                              <p className="text-sm bg-destructive/10 p-2 rounded">
                                {suggestion.originalText || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Suggested</p>
                              <p className="text-sm bg-success/10 p-2 rounded">
                                {suggestion.suggestedText || "N/A"}
                              </p>
                            </div>
                          </div>
                          {suggestion.reasoning && (
                            <p className="text-xs text-muted-foreground italic">
                              Reason: {suggestion.reasoning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedEssay.manual_edits?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Manual Edits ({selectedEssay.manual_edits.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedEssay.manual_edits.map((edit: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-4 py-2">
                          <p className="text-sm">{edit.description || edit.text || "Edit made"}</p>
                          {edit.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(edit.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Original Content</h4>
                        <Badge variant="outline">{selectedEssay.original_content.length} chars</Badge>
                      </div>
                      <ScrollArea className="h-[400px] border rounded-lg p-4">
                        <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                          {selectedEssay.original_content}
                        </div>
                      </ScrollArea>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Final Content</h4>
                        <Badge variant="default">{selectedEssay.final_content.length} chars</Badge>
                      </div>
                      <ScrollArea className="h-[400px] border rounded-lg p-4 bg-success/5">
                        <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                          {selectedEssay.final_content}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedEssay.admin_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedEssay.admin_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
