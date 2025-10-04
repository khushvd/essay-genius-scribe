import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowUpCircle, Loader2 } from "lucide-react";

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
      .select("*")
      .order("added_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch training data");
      console.error(error);
    } else {
      setEssays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrainingEssays();
  }, []);

  const handleAction = async (essayId: string, action: "approve" | "reject" | "portfolio") => {
    setActionLoading(true);
    
    if (action === "approve") {
      const { error } = await supabase
        .from("training_essays")
        .update({ status: "approved" })
        .eq("id", essayId);

      if (error) {
        toast.error("Failed to approve training data");
      } else {
        toast.success("Training data approved");
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
    } else if (action === "portfolio") {
      const essay = essays.find(e => e.id === essayId);
      if (!essay) return;

      const { error } = await supabase
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

      if (error) {
        toast.error("Failed to add to portfolio");
      } else {
        const { error: updateError } = await supabase
          .from("training_essays")
          .update({ status: "in_portfolio" })
          .eq("id", essayId);

        if (updateError) {
          toast.error("Failed to update status");
        } else {
          toast.success("Added to successful essays portfolio");
          fetchTrainingEssays();
        }
      }
    }
    
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge variant="outline">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "in_portfolio":
        return <Badge className="bg-primary text-primary-foreground">In Portfolio</Badge>;
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
                        {essay.metadata?.title || "Untitled Essay"}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(essay.added_at).toLocaleDateString()}</span>
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
                        onClick={() => handleAction(essay.id, "approve")}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve for Training
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(essay.id, "portfolio")}
                        disabled={actionLoading}
                      >
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        Add to Portfolio
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
            <Card>
              <CardHeader>
                <CardTitle>{selectedEssay.metadata?.title || "Untitled Essay"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Original Content</h4>
                  <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedEssay.original_content}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Final Content</h4>
                  <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedEssay.final_content}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Before Scores</h4>
                    <div className="space-y-1 text-sm">
                      <p>Overall: {selectedEssay.before_score?.overall_score || 0}</p>
                      <p>Clarity: {selectedEssay.before_score?.clarity_score || 0}</p>
                      <p>Impact: {selectedEssay.before_score?.impact_score || 0}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">After Scores</h4>
                    <div className="space-y-1 text-sm">
                      <p>Overall: {selectedEssay.after_score?.overall_score || 0}</p>
                      <p>Clarity: {selectedEssay.after_score?.clarity_score || 0}</p>
                      <p>Impact: {selectedEssay.after_score?.impact_score || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
