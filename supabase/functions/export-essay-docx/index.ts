import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  convertInchesToTwip,
} from "https://esm.sh/docx@8.5.0";

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

    // Fetch suggestions for editorial feedback section
    const { data: suggestions } = await supabaseAdmin
      .from("essay_analytics")
      .select("*")
      .eq("essay_id", essayId)
      .eq("action", "applied")
      .order("created_at", { ascending: false });

    // Build document sections
    const title = essay.title || "Untitled Essay";
    const contentParagraphs = essay.content.split('\n').filter(Boolean);

    const sections = [];

    // Title (14pt, bold, centered)
    sections.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        style: "Title",
      })
    );

    // Essay content paragraphs (12pt, justified, 1.15 spacing)
    contentParagraphs.forEach((para: string) => {
      sections.push(
        new Paragraph({
          children: [new TextRun(para)],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 276, lineRule: "auto" }, // 1.15 line spacing
        })
      );
    });

    // Page break before editorial feedback
    if (suggestions && suggestions.length > 0) {
      sections.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );

      sections.push(
        new Paragraph({
          text: "Editorial Feedback",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );

      suggestions.forEach((s: any) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Original: ", bold: true }),
              new TextRun(s.original_text || ""),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Suggestion: ", bold: true }),
              new TextRun(s.suggested_text || ""),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Reason: ", bold: true }),
              new TextRun(s.reasoning || ""),
            ],
            spacing: { after: 120 },
          })
        );
      });
    }

    // Create DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: sections,
        },
      ],
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt (half-points)
            },
          },
        },
        paragraphStyles: [
          {
            id: "Title",
            name: "Title",
            basedOn: "Normal",
            run: {
              font: "Times New Roman",
              size: 28, // 14pt
              bold: true,
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
            },
          },
        ],
      },
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${essay.title || "essay"}.docx"`,
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
