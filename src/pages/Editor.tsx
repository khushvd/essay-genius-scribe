import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import EditorSuggestions from "@/components/editor/EditorSuggestions";
import { EditorPreview } from "@/components/editor/EditorPreview";
import { EssayScoreCard } from "@/components/editor/EssayScoreCard";

// Debounce helper
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState<any>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const hasMinContent = content.length >= 50;

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
      setOriginalContent(data.content);
      setLastSaved(new Date(data.updated_at));
      setLoading(false);
    };

    fetchEssay();
  }, [id, navigate]);

  // Auto-save with debouncing
  const debouncedSave = useMemo(
    () => debounce(async (newContent: string, essayId: string) => {
      setIsSaving(true);
      const { error } = await supabase
        .from("essays")
        .update({ 
          content: newContent, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", essayId);
      
      setIsSaving(false);
      if (!error) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } else {
        console.error('Auto-save failed:', error);
      }
    }, 2000),
    []
  );

  // Trigger auto-save on content change
  useEffect(() => {
    if (content !== essay?.content && essay?.id) {
      setHasUnsavedChanges(true);
      debouncedSave(content, essay.id);
    }
  }, [content, essay?.content, essay?.id, debouncedSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("essays")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success("Essay saved successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = (suggestion: any) => {
    try {
      const { start, end } = suggestion.location;
      const { suggestion: suggestedText, originalText } = suggestion;
      
      // Validate that the original text still exists at the specified location
      const currentText = content.substring(start, end);
      
      if (currentText !== originalText) {
        toast.error('Cannot apply suggestion - the text has changed');
        return;
      }

      // Apply the replacement
      const newContent =
        content.substring(0, start) +
        suggestedText +
        content.substring(end);
      
      setContent(newContent);
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));
      
      toast.success('Suggestion applied');
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));
  };

  const handleExportAsWord = async () => {
    if (!essay) return;
    
    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('export-essay-docx', {
        body: { essayId: essay.id },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`
        }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${essay.title || 'essay'}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Essay exported successfully");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export essay");
    }
  };

  const handleMarkComplete = async () => {
    if (!essay) return;

    try {
      const session = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('create-training-snapshot', {
        body: {
          essayId: essay.id,
          originalContent: originalContent,
          finalContent: content,
          suggestionsApplied: Array.from(appliedSuggestions),
          suggestionsDismissed: [],
          manualEdits: []
        },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success("Training snapshot created successfully");
    } catch (error) {
      console.error('Mark complete error:', error);
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
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <Button onClick={handleExportAsWord} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleMarkComplete} variant="outline" size="sm">
                Mark Complete
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          
          {!essay.college_id || !essay.programme_id ? (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!essay.college_id && !essay.programme_id 
                  ? "No college or programme selected - feedback will be generic"
                  : !essay.college_id
                  ? "No college selected - feedback may be less personalized"
                  : "No programme selected - feedback may be less personalized"}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mt-4">
              <AlertDescription className="text-muted-foreground">
                ✓ Tailored feedback for {essay.colleges?.name} - {essay.programmes?.name}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor Pane */}
              <div className="bg-card rounded-2xl shadow-soft border border-border p-4 md:p-8">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Editor</h3>
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 p-0"
                  placeholder="Write your essay here..."
                  style={{ backgroundColor: 'transparent' }}
                />
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
                  <span>{content.length} characters</span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <Badge variant={hasMinContent ? "secondary" : "outline"}>
                    {hasMinContent ? "Ready for feedback" : "Add more content"}
                  </Badge>
                </div>
              </div>

              {/* Preview Pane with Highlights */}
              <div className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
                <div className="p-4 md:p-6 border-b border-border">
                  <h3 className="text-sm font-medium text-muted-foreground">Preview with Suggestions</h3>
                  <p className="text-xs text-muted-foreground mt-1">Click on highlighted text to see suggestions</p>
                </div>
                <div className="h-[500px]">
                  <EditorPreview
                    content={content}
                    suggestions={suggestions}
                    appliedSuggestions={appliedSuggestions}
                    onApply={handleApplySuggestion}
                    onDismiss={handleDismissSuggestion}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop: Side Panel */}
        <div className="w-[400px] hidden lg:block overflow-auto border-l border-border">
          <div className="p-4 space-y-4 sticky top-0">
            <EssayScoreCard essayId={id!} />
            <EditorSuggestions
              essayId={id!}
              content={content}
              collegeId={essay.college_id}
              programmeId={essay.programme_id}
              cvData={essay.cv_data}
              englishVariant={essay.programmes?.english_variant || "american"}
              onApplySuggestion={handleApplySuggestion}
              collegeName={essay.colleges?.name}
              programmeName={essay.programmes?.name}
              onSuggestionsUpdate={setSuggestions}
            />
          </div>
        </div>

        {/* Mobile: Floating Button + Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button 
              className="fixed bottom-4 right-4 lg:hidden z-50 shadow-lg"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              View Feedback
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] overflow-auto">
            <div className="p-4 space-y-4">
              <EssayScoreCard essayId={id!} />
              <EditorSuggestions
                essayId={id!}
                content={content}
                collegeId={essay.college_id}
                programmeId={essay.programme_id}
                cvData={essay.cv_data}
                englishVariant={essay.programmes?.english_variant || "american"}
                onApplySuggestion={handleApplySuggestion}
                collegeName={essay.colleges?.name}
                programmeName={essay.programmes?.name}
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
