import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, FileCheck, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface EditorLoadingScreenProps {
  essayId: string;
  essayTitle?: string;
  onAnalysisComplete: () => void;
}

const loadingMessages = [
  "Reading your essay...",
  "Analyzing structure and style...",
  "Comparing with 1000+ successful essays...",
  "Finding patterns and opportunities...",
  "Crafting personalized suggestions...",
  "Finalizing editorial feedback...",
];

// Generate a simple hash of content for caching
const generateContentHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

export const EditorLoadingScreen = ({
  essayId,
  essayTitle,
  onAnalysisComplete,
}: EditorLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const analysisTriggered = useRef(false);

  // Trigger AI analysis immediately on mount
  useEffect(() => {
    const triggerAnalysis = async () => {
      // Prevent duplicate calls
      if (analysisTriggered.current) return;
      analysisTriggered.current = true;

      try {
        // Fetch essay data to get content and other details
        const { data: essay, error: essayError } = await supabase
          .from("essays")
          .select(`
            *,
            colleges (name, country),
            programmes (name, english_variant)
          `)
          .eq("id", essayId)
          .single();

        if (essayError || !essay) {
          console.error("Error fetching essay:", essayError);
          return;
        }

        // Check if content is sufficient for analysis
        if (!essay.content || essay.content.trim().length < 50) {
          console.log("Essay content too short for analysis");
          return;
        }

        // Check for existing analysis in cache
        const contentHash = generateContentHash(essay.content);
        const cacheKey = `essay_analysis_${essayId}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            const cacheAge = Date.now() - cacheData.timestamp;

            // Use cache if valid and content hasn't changed
            if (cacheAge < 30 * 60 * 1000 && cacheData.contentHash === contentHash) {
              console.log("Using cached analysis");
              setHasAnalysis(true);
              return;
            }
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        // Store content hash for polling to check
        sessionStorage.setItem(`${essayId}-content-hash`, contentHash);

        // Trigger AI analysis in background
        console.log("Triggering AI analysis for essay:", essayId);
        supabase.functions.invoke('analyze-essay', {
          body: {
            essayId,
            content: essay.content,
            collegeId: essay.college_id,
            programmeId: essay.programme_id,
            cvData: essay.cv_data,
            englishVariant: (essay.programmes?.english_variant as "american" | "british") || "american",
            mode: 'feedback',
          },
        }).then(({ data, error }) => {
          if (error) {
            console.error("Analysis error:", error);
          } else {
            console.log("Analysis completed successfully");
            // Cache the results in sessionStorage
            if (data?.suggestions) {
              const cacheKey = `essay_analysis_${essayId}`;
              sessionStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                suggestions: data.suggestions,
                contentHash: contentHash,
                analysisId: data.analysisId || `analysis-${Date.now()}`
              }));
              // Trigger immediate check to transition faster
              setHasAnalysis(true);
            }
          }
        });
      } catch (err) {
        console.error("Error triggering analysis:", err);
      }
    };

    triggerAnalysis();
  }, [essayId]);

  // Smooth progress animation (0-95% over ~60 seconds)
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Cap at 95% until analysis completes
        return prev + 0.5;
      });
    }, 300); // Update every 300ms for smoother animation

    return () => clearInterval(progressInterval);
  }, []);

  // Cycle through messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(messageInterval);
  }, []);

  // Poll for analysis completion with immediate first check
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 20; // 20 polls * 3 seconds = 60 seconds max
    
    const checkAnalysis = async () => {
      try {
        // Check sessionStorage cache first
        const cacheKey = `essay_analysis_${essayId}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            const cacheAge = Date.now() - cacheData.timestamp;
            // Cache valid for 30 minutes
            if (cacheAge < 30 * 60 * 1000 && cacheData.suggestions) {
              console.log("Analysis found in cache");
              setHasAnalysis(true);
              setProgress(100);

              setTimeout(() => {
                onAnalysisComplete();
              }, 500);
              return true;
            }
          } catch (e) {
            // Invalid cache, continue checking database
            sessionStorage.removeItem(cacheKey);
          }
        }

        // Check if analysis exists in essay_analytics table
        const { data, error } = await supabase
          .from("essay_analytics")
          .select("id")
          .eq("essay_id", essayId)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          console.log("Analysis found in database");
          setHasAnalysis(true);
          setProgress(100);

          // Wait a moment to show 100% completion
          setTimeout(() => {
            onAnalysisComplete();
          }, 500);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error polling for analysis:", err);
        return false;
      }
    };

    // Run first check immediately
    checkAnalysis();

    const pollInterval = setInterval(async () => {
      pollCount++;
      
      const completed = await checkAnalysis();
      
      if (completed) {
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        // Timeout after 60 seconds - proceed anyway
        setProgress(100);
        setTimeout(() => {
          onAnalysisComplete();
        }, 500);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [essayId, onAnalysisComplete]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Animated Icon */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">
            Preparing Your Editor
          </h1>
          {essayTitle && (
            <p className="text-sm text-muted-foreground">
              {essayTitle}
            </p>
          )}
          <p className="text-lg text-muted-foreground">
            Your editor is analyzing <span className="font-semibold text-foreground">1000+ successful essays</span> to craft personalized suggestions...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {progress}% complete
          </p>
        </div>

        {/* Current Step */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          {hasAnalysis ? (
            <>
              <FileCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium">Analysis complete!</p>
            </>
          ) : (
            <>
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <p className="text-sm font-medium animate-pulse">
                {loadingMessages[messageIndex]}
              </p>
            </>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-3 pt-4">
          <div className="bg-card/50 border border-border/50 rounded-lg p-3 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Advanced Analysis</p>
              <p className="text-xs text-muted-foreground">
                Using advanced analysis to provide editorial feedback specific to your target college and program
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
