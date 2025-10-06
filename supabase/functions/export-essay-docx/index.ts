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

    // Create Supabase client with service role key for proper auth verification
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      throw new Error("Unauthorized");
    }

    console.log("Export request from user:", user.id);

    const { essayId } = await req.json();

    // Fetch essay and verify ownership
    const { data: essay, error: essayError } = await supabaseAdmin
      .from("essays")
      .select("*")
      .eq("id", essayId)
      .eq("writer_id", user.id)
      .single();

    if (essayError || !essay) {
      throw new Error("Essay not found or access denied");
    }

    // For now, return rich text format (RTF) which Word can open
    // RTF is simpler than generating proper DOCX and doesn't require external libraries
    const title = essay.title || "Untitled Essay";
    const content = essay.content.replace(/\n/g, "\\par\n");
    
    const rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fswiss Helvetica;}{\\f1\\froman Times New Roman;}}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\f1\\fs24
{\\b\\fs32 ${title}\\par}
\\par
${content}
\\par
}`;

    return new Response(rtfContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rtf",
        "Content-Disposition": `attachment; filename="${essay.title || "essay"}.rtf"`,
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
