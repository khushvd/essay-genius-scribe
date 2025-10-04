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

    const { essayId } = await req.json();

    // Fetch essay and verify ownership
    const { data: essay, error: essayError } = await supabase
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .eq("writer_id", user.id)
      .single();

    if (essayError || !essay) {
      throw new Error("Essay not found or access denied");
    }

    // Create plain text content formatted for Word
    const textContent = [
      essay.title || "Untitled Essay",
      "",
      "=" .repeat((essay.title || "Untitled Essay").length),
      "",
      essay.content,
    ].join("\n");

    return new Response(textContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="${essay.title || "essay"}.doc"`,
      },
    });
  } catch (error: any) {
    console.error("Error in export-essay-docx function:", error);
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
