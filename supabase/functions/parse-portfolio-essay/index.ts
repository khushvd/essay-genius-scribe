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

    const systemPrompt = `You are an expert at analyzing winning college essays with access to web search capabilities. Extract structured data from the provided documents.

Your task:
1. Identify the essay title (infer from content if not explicit)
2. Extract college/university name - USE YOUR WEB SEARCH to verify and find the official full name if needed
3. Extract programme/major name - USE YOUR WEB SEARCH to verify this programme exists at the college
4. Determine degree level (bachelors or masters)
5. Summarize the writer's background from the resume
6. Structure the questionnaire responses as key-value pairs
7. Identify 3-5 key strategies that made this essay successful
8. Suggest a performance score (0-100) based on quality

CRITICAL: For college and programme names:
- If the name seems abbreviated or informal, search for the official full name
- Verify the college exists and get its correct spelling
- Verify the programme is actually offered at that college
- Return standardized, official names that match institutional records

Set the search_used flag to true if you used web search for verification.`;

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
                  description: 'Full official verified name of the target institution'
                },
                programme_name: {
                  type: 'string',
                  description: 'Specific program or major name, verified'
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
                },
                search_used: {
                  type: 'boolean',
                  description: 'Whether web search was used to verify college/programme names'
                },
                college_name_verified: {
                  type: 'boolean',
                  description: 'Whether the college name was verified via web search'
                },
                programme_name_verified: {
                  type: 'boolean',
                  description: 'Whether the programme name was verified via web search'
                }
              },
              required: ['essay_title', 'essay_content', 'college_name', 'programme_name', 'degree_level', 'key_strategies', 'suggested_score', 'search_used']
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

    // Now search our database for matching college and programme
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let college_id: string | null = null;
    let programme_id: string | null = null;
    let college_matches: Array<{ id: string; name: string; country: string }> = [];
    let programme_matches: Array<{ id: string; name: string; english_variant: string }> = [];

    // Search for college by name (fuzzy match using ILIKE)
    if (extractedData.college_name) {
      const { data: colleges } = await supabaseClient
        .from('colleges')
        .select('id, name, country')
        .ilike('name', `%${extractedData.college_name}%`)
        .limit(5);
      
      if (colleges && colleges.length > 0) {
        college_matches = colleges;
        // Auto-select if exact match
        const exactMatch = colleges.find(c => 
          c.name.toLowerCase() === extractedData.college_name.toLowerCase()
        );
        college_id = exactMatch ? exactMatch.id : colleges[0].id;
      }
    }

    // If college found, search for programme
    if (college_id && extractedData.programme_name) {
      const { data: programmes } = await supabaseClient
        .from('programmes')
        .select('id, name, english_variant')
        .eq('college_id', college_id)
        .ilike('name', `%${extractedData.programme_name}%`)
        .limit(5);
      
      if (programmes && programmes.length > 0) {
        programme_matches = programmes;
        // Auto-select if exact match
        const exactMatch = programmes.find(p => 
          p.name.toLowerCase() === extractedData.programme_name.toLowerCase()
        );
        programme_id = exactMatch ? exactMatch.id : programmes[0].id;
      }
    }

    const responseData = {
      ...extractedData,
      college_id,
      programme_id,
      college_matches,
      programme_matches
    };

    return new Response(
      JSON.stringify(responseData),
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
