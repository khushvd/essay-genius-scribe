import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  EditorHeader,
  EditorPanel,
  PreviewPanel,
  SuggestionsPanel,
  useEssayData,
  useAutoSave,
  useEssaySuggestions,
} from "@/features/essay-editor";

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Use custom hooks
  const { essay, loading } = useEssayData(id);
  const { isSaving, lastSaved, saveNow } = useAutoSave({
    essayId: id || "",
    content,
    originalContent: essay?.content || "",
  });
  const { suggestions, appliedSuggestions, setSuggestions, applySuggestion, dismissSuggestion } = useEssaySuggestions(
    id || "",
  );

  // Initialize content when essay loads
  useEffect(() => {
    if (essay?.content && essay.content !== content) {
      setContent(essay.content);
    }
  }, [essay?.content]); // Add essay?.content to dependencies;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNow();
      toast.success("Essay saved successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    applySuggestion(suggestion, content, setContent);
  };

  const handleExportAsWord = async () => {
    if (!essay) return;

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-essay-docx`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ essayId: essay.id }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Generate filename: college_programme_title.rtf
      const collegeName = essay.colleges?.name || essay.custom_college_name || "essay";
      const programmeName = essay.programmes?.name || essay.custom_programme_name || "";
      const title = essay.title || "essay";
      const filename = `${collegeName}_${programmeName}_${title}`.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

      a.download = `${filename}.rtf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Essay exported as RTF (opens in Word)");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export essay");
    }
  };

  const handleMarkComplete = async () => {
    if (!essay) return;

    try {
      const session = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("create-training-snapshot", {
        body: {
          essayId: essay.id,
          originalContent: essay.content,
          finalContent: content,
          suggestionsApplied: Array.from(appliedSuggestions),
          suggestionsDismissed: [],
          manualEdits: [],
        },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (error) throw error;
      toast.success("Training snapshot created successfully");
    } catch (error) {
      console.error("Mark complete error:", error);
      toast.error("Failed to create snapshot");
    }
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

  if (!essay) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <EditorHeader
        essay={essay}
        isSaving={isSaving}
        lastSaved={lastSaved}
        saving={saving}
        onBack={() => navigate("/dashboard")}
        onSave={handleSave}
        onExport={handleExportAsWord}
        onMarkComplete={handleMarkComplete}
      />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EditorPanel content={content} onChange={setContent} />
              <PreviewPanel
                content={content}
                suggestions={suggestions}
                appliedSuggestions={appliedSuggestions}
                onApply={handleApplySuggestion}
                onDismiss={dismissSuggestion}
              />
            </div>
          </div>
        </div>

        {/* Desktop: Side Panel */}
        <div className="w-[400px] hidden lg:block overflow-auto border-l border-border">
          <div className="p-4 sticky top-0">
            <SuggestionsPanel
              essayId={id!}
              content={content}
              collegeId={essay.college_id}
              programmeId={essay.programme_id}
              cvData={essay.cv_data}
              englishVariant={(essay.programmes?.english_variant as "american" | "british") || "american"}
              collegeName={essay.colleges?.name}
              programmeName={essay.programmes?.name}
              onApply={handleApplySuggestion}
              onSuggestionsUpdate={setSuggestions}
            />
          </div>
        </div>

        {/* Mobile: Floating Button + Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button className="fixed bottom-4 right-4 lg:hidden z-50 shadow-lg" size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              View Feedback
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] overflow-auto">
            <div className="p-4">
              <SuggestionsPanel
                essayId={id!}
                content={content}
                collegeId={essay.college_id}
                programmeId={essay.programme_id}
                cvData={essay.cv_data}
                englishVariant={(essay.programmes?.english_variant as "american" | "british") || "american"}
                collegeName={essay.colleges?.name}
                programmeName={essay.programmes?.name}
                onApply={handleApplySuggestion}
                onSuggestionsUpdate={setSuggestions}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </main>
    </div>
  );
};

export default Editor;
