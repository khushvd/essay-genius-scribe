import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { 
      essayId, 
      originalContent, 
      finalContent, 
      suggestionsApplied, 
      suggestionsDismissed, 
      manualEdits 
    } = await req.json();

    // Fetch essay to verify ownership
    const { data: essay, error: essayError } = await supabase
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .eq("writer_id", user.id)
      .single();

    if (essayError || !essay) {
      throw new Error("Essay not found or access denied");
    }

    // Fetch before and after scores
    const { data: scores } = await supabase
      .from("essay_scores")
      .select("*")
      .eq("essay_id", essayId)
      .order("scored_at", { ascending: true });

    const beforeScore = scores?.[0] || null;
    const afterScore = scores?.[scores.length - 1] || null;

    // Calculate improvement metrics
    const improvementMetrics = {
      overallImprovement: afterScore?.overall_score - beforeScore?.overall_score || 0,
      clarityImprovement: afterScore?.clarity_score - beforeScore?.clarity_score || 0,
      impactImprovement: afterScore?.impact_score - beforeScore?.impact_score || 0,
      authenticityImprovement: afterScore?.authenticity_score - beforeScore?.authenticity_score || 0,
      coherenceImprovement: afterScore?.coherence_score - beforeScore?.coherence_score || 0,
      totalSuggestionsApplied: suggestionsApplied?.length || 0,
      totalSuggestionsDismissed: suggestionsDismissed?.length || 0,
      totalManualEdits: manualEdits?.length || 0,
    };

    // Strip PII from CV data and questionnaire
    const sanitizedMetadata = {
      title: essay.title,
      college_id: essay.college_id,
      programme_id: essay.programme_id,
      degree_level: essay.degree_level,
      custom_college_name: essay.custom_college_name,
      custom_programme_name: essay.custom_programme_name,
      // Keep only non-PII questionnaire data
      questionnaire_data: essay.questionnaire_data ? {
        hasWorkExperience: essay.questionnaire_data.hasWorkExperience,
        hasResearchExperience: essay.questionnaire_data.hasResearchExperience,
        hasLeadershipExperience: essay.questionnaire_data.hasLeadershipExperience,
      } : null,
    };

    // Create training snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("training_essays")
      .insert({
        essay_id: essayId,
        original_content: originalContent,
        final_content: finalContent,
        suggestions_applied: suggestionsApplied,
        suggestions_dismissed: suggestionsDismissed,
        manual_edits: manualEdits,
        before_score: beforeScore,
        after_score: afterScore,
        improvement_metrics: improvementMetrics,
        metadata: sanitizedMetadata,
        added_by: user.id,
        status: "pending_review",
      })
      .select()
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    console.log("Training snapshot created successfully:", snapshot.id);

    return new Response(
      JSON.stringify({ success: true, snapshotId: snapshot.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-training-snapshot function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
