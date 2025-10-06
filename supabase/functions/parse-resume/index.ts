import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();

    if (!resumeText || resumeText.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Resume text too short or empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Parsing resume with AI...");

    const systemPrompt = `You are an expert at parsing resumes and extracting structured information.

Extract the following from the resume:
1. Full name
2. Education (institutions, degrees, graduation years, majors)
3. Work experience (companies, roles, dates, key responsibilities)
4. Skills and certifications
5. Academic interests and research areas
6. Extracurricular activities and leadership roles
7. Career goals (inferred from objective/summary if present)

Return structured JSON data that can be used to auto-populate an essay questionnaire.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this resume:\n\n${resumeText}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_parsed_resume",
            description: "Return the parsed resume data in structured format",
            parameters: {
              type: "object",
              properties: {
                full_name: { type: "string", description: "Person's full name" },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      institution: { type: "string" },
                      degree: { type: "string" },
                      major: { type: "string" },
                      graduation_year: { type: "string" }
                    }
                  }
                },
                work_experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string" },
                      role: { type: "string" },
                      duration: { type: "string" },
                      responsibilities: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                skills: { type: "array", items: { type: "string" } },
                academic_interests: { type: "array", items: { type: "string" } },
                extracurriculars: { type: "array", items: { type: "string" } },
                career_goals: { type: "string" }
              },
              required: ["full_name"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_parsed_resume" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsedResume = JSON.parse(toolCall.function.arguments);
    console.log("Resume parsed successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        parsed_data: parsedResume
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error in parse-resume function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
