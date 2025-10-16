import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  EditorHeader,
  EditorPanel,
  PreviewPanel,
  SuggestionsPanel,
  useEssayData,
  useAutoSave,
  useEssaySuggestions,
  useTrainingSnapshot,
} from "@/features/essay-editor";
import { EditorLoadingScreen } from "@/components/editor/EditorLoadingScreen";

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(
    searchParams.get("new") === "true"
  );

  // Use custom hooks
  const { essay, loading, error, retry } = useEssayData(id);
  const { isSaving, lastSaved, saveNow } = useAutoSave({
    essayId: id || "",
    content,
    originalContent: essay?.content || "",
    enabled: isContentInitialized,
  });
  const { suggestions, appliedSuggestions, setSuggestions, applySuggestion, dismissSuggestion } = useEssaySuggestions(
    id || "",
  );

  // Initialize content when essay loads
  useEffect(() => {
    if (essay && !isContentInitialized) {
      setContent(essay.content || "");
      setOriginalContent(essay.content || "");
      setIsContentInitialized(true);
    }
  }, [essay, isContentInitialized]);

  const { submitForTraining, isSubmitting: isSubmittingTraining } = useTrainingSnapshot({
    essayId: id!,
    originalContent,
    currentContent: content,
  });

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

  const handleApplySuggestion = (suggestion: any): boolean => {
    return applySuggestion(suggestion, content, setContent);
  };

  const sanitizeFilename = (value: string | null | undefined): string => {
    return value?.trim() || "unnamed";
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
      const collegeName = sanitizeFilename(essay.colleges?.name || essay.custom_college_name);
      const programmeName = sanitizeFilename(essay.programmes?.name || essay.custom_programme_name);
      const title = sanitizeFilename(essay.title);
      const filename = `${collegeName}_${programmeName}_${title}`.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update last_exported_at timestamp
      const { error: updateError } = await supabase
        .from("essays")
        .update({ last_exported_at: new Date().toISOString() })
        .eq("id", essay.id);

      if (updateError) {
        console.error("Failed to update export timestamp:", updateError);
        // Don't show error to user - export succeeded
      }

      toast.success("Essay exported as DOCX");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export essay");
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-2xl shadow-soft border border-border p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to Load Essay</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <Button onClick={retry} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!essay) {
    return null;
  }

  // Show loading screen for new essays
  if (showLoadingScreen) {
    return (
      <EditorLoadingScreen
        essayId={id!}
        essayTitle={essay.title}
        onAnalysisComplete={() => {
          setShowLoadingScreen(false);
          // Remove the ?new=true param from URL
          searchParams.delete("new");
          setSearchParams(searchParams, { replace: true });
        }}
      />
    );
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
          onSubmitTraining={submitForTraining}
          isSubmittingTraining={isSubmittingTraining}
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
        <div className="w-[400px] hidden lg:flex flex-col border-l border-border overflow-y-auto">
          <div className="p-4">
            <SuggestionsPanel
              suggestions={suggestions}
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
              appliedSuggestions={appliedSuggestions}
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
                suggestions={suggestions}
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
                appliedSuggestions={appliedSuggestions}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </main>
    </div>
  );
};

export default Editor;
