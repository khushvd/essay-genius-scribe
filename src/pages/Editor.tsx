import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EditorSuggestions from "@/components/editor/EditorSuggestions";

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState<any>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEssay = async () => {
      const { data, error } = await supabase
        .from("essays")
        .select(`
          *,
          colleges (name),
          programmes (name, english_variant)
        `)
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Essay not found");
        navigate("/dashboard");
        return;
      }

      setEssay(data);
      setContent(data.content);
      setLoading(false);
    };

    fetchEssay();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("essays")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Essay saved successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    const before = content.substring(0, suggestion.location.start);
    const after = content.substring(suggestion.location.end);
    const newContent = before + suggestion.suggestion + after;
    setContent(newContent);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold font-serif">{essay.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {essay.colleges?.name} • {essay.programmes?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {essay.programmes?.english_variant === "british" ? "British" : "American"} English
              </Badge>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[600px] font-serif text-base leading-relaxed resize-none border-0 focus-visible:ring-0 p-0"
                placeholder="Write your essay here..."
              />
            </div>
          </div>
        </div>
        
        <div className="w-[400px] hidden lg:block">
          <EditorSuggestions
            essayId={id!}
            content={content}
            collegeId={essay.college_id}
            programmeId={essay.programme_id}
            cvData={essay.cv_data}
            englishVariant={essay.programmes?.english_variant || "american"}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      </main>
    </div>
  );
};

export default Editor;
