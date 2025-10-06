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
    console.log("🤖 Auto-complete essays cron job started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // Find essays ready for auto-completion
    // Criteria 1: Exported AND no updates for 12+ hours
    // Criteria 2: No export AND no updates for 72+ hours
    const { data: essays, error: fetchError } = await supabaseAdmin
      .from("essays")
      .select(`
        id,
        content,
        writer_id,
        last_exported_at,
        updated_at,
        title,
        college_id,
        programme_id,
        degree_level,
        custom_college_name,
        custom_programme_name,
        cv_data,
        questionnaire_data
      `)
      .eq("completion_status", "in_progress")
      .or(
        `and(last_exported_at.not.is.null,last_exported_at.lte.${twelveHoursAgo.toISOString()},updated_at.lte.${twelveHoursAgo.toISOString()}),` +
        `and(last_exported_at.is.null,updated_at.lte.${seventyTwoHoursAgo.toISOString()})`
      );

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Found ${essays?.length || 0} essays ready for auto-completion`);

    if (!essays || essays.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No essays ready for completion",
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const essay of essays) {
      try {
        console.log(`📝 Processing essay ${essay.id} for user ${essay.writer_id}`);

        // Fetch essay scores
        const { data: scores } = await supabaseAdmin
          .from("essay_scores")
          .select("*")
          .eq("essay_id", essay.id)
          .order("scored_at", { ascending: true });

        const beforeScore = scores?.[0] || null;
        const afterScore = scores?.[scores.length - 1] || null;

        // Calculate improvement metrics
        const improvementMetrics = {
          overallImprovement: (afterScore?.overall_score || 0) - (beforeScore?.overall_score || 0),
          clarityImprovement: (afterScore?.clarity_score || 0) - (beforeScore?.clarity_score || 0),
          impactImprovement: (afterScore?.impact_score || 0) - (beforeScore?.impact_score || 0),
          authenticityImprovement: (afterScore?.authenticity_score || 0) - (beforeScore?.authenticity_score || 0),
          coherenceImprovement: (afterScore?.coherence_score || 0) - (beforeScore?.coherence_score || 0),
          autoCompleted: true,
          completionReason: essay.last_exported_at 
            ? "exported_and_inactive_12h" 
            : "inactive_72h",
        };

        // Sanitize metadata (remove PII)
        const sanitizedMetadata = {
          title: essay.title,
          college_id: essay.college_id,
          programme_id: essay.programme_id,
          degree_level: essay.degree_level,
          custom_college_name: essay.custom_college_name,
          custom_programme_name: essay.custom_programme_name,
          questionnaire_data: essay.questionnaire_data ? {
            hasWorkExperience: essay.questionnaire_data.hasWorkExperience,
            hasResearchExperience: essay.questionnaire_data.hasResearchExperience,
            hasLeadershipExperience: essay.questionnaire_data.hasLeadershipExperience,
          } : null,
        };

        // Create training snapshot
        const { data: snapshot, error: snapshotError } = await supabaseAdmin
          .from("training_essays")
          .insert({
            essay_id: essay.id,
            original_content: essay.content,
            final_content: essay.content,
            suggestions_applied: [],
            suggestions_dismissed: [],
            manual_edits: [],
            before_score: beforeScore,
            after_score: afterScore,
            improvement_metrics: improvementMetrics,
            metadata: sanitizedMetadata,
            added_by: essay.writer_id,
            status: "pending_review",
          })
          .select()
          .single();

        if (snapshotError) {
          throw snapshotError;
        }

        // Mark essay as completed
        const { error: updateError } = await supabaseAdmin
          .from("essays")
          .update({ completion_status: "completed" })
          .eq("id", essay.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Essay ${essay.id} auto-completed successfully (snapshot: ${snapshot.id})`);
        successCount++;
        results.push({
          essayId: essay.id,
          snapshotId: snapshot.id,
          status: "success",
        });

      } catch (error: any) {
        console.error(`❌ Failed to auto-complete essay ${essay.id}:`, error);
        failureCount++;
        results.push({
          essayId: essay.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    console.log(`✨ Auto-completion complete: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: essays.length,
        successCount,
        failureCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in auto-complete-essays function:", error);
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
