import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essayContent, resumeContent, questionnaireContent } = await req.json();

    if (!essayContent) {
      return new Response(
        JSON.stringify({ error: "Essay content is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert at analyzing winning college essays. Extract structured data from the provided documents.

Your task:
1. Identify the essay title (infer from content if not explicit)
2. Extract college/university name
3. Extract specific programme/major name
4. Determine degree level (bachelors or masters)
5. Summarize the writer's background from the resume
6. Structure the questionnaire responses as key-value pairs
7. Identify 3-5 key strategies that made this essay successful
8. Suggest a performance score (0-100) based on quality

Be precise and extract exact names for colleges and programmes.`;

    const userPrompt = `Essay Content:
${essayContent}

${resumeContent ? `\nResume/CV Content:\n${resumeContent}` : ''}

${questionnaireContent ? `\nQuestionnaire Content:\n${questionnaireContent}` : ''}

Extract and structure all relevant data from these documents.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_portfolio_data',
            description: 'Extract structured data from winning essay documents',
            parameters: {
              type: 'object',
              properties: {
                essay_title: {
                  type: 'string',
                  description: 'The title of the essay, inferred if not explicit'
                },
                essay_content: {
                  type: 'string',
                  description: 'The full essay text, cleaned'
                },
                college_name: {
                  type: 'string',
                  description: 'Full official name of the target institution'
                },
                programme_name: {
                  type: 'string',
                  description: 'Specific program or major name'
                },
                degree_level: {
                  type: 'string',
                  enum: ['bachelors', 'masters'],
                  description: 'Level of degree'
                },
                writer_resume: {
                  type: 'string',
                  description: 'Summary of writer background and achievements'
                },
                writer_questionnaire: {
                  type: 'object',
                  description: 'Structured questionnaire responses as key-value pairs',
                  additionalProperties: true
                },
                key_strategies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of 3-5 key strategies that made this essay successful'
                },
                suggested_score: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 100,
                  description: 'Quality assessment score'
                }
              },
              required: ['essay_title', 'essay_content', 'college_name', 'programme_name', 'degree_level', 'key_strategies', 'suggested_score']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_portfolio_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse documents with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'AI did not return structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    } catch (error) {
      console.error('Error in parse-portfolio-essay:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  });
