import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essayId, content, collegeId, programmeId, cvData, englishVariant } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch successful essays only if college and programme are provided
    let ragContext = 'No specific college/programme context provided. Providing general editorial guidance based on best practices for college essays.';
    
    if (collegeId && programmeId) {
      const { data: successfulEssays, error: essaysError } = await supabase
        .from('successful_essays')
        .select('essay_content, key_strategies, performance_score')
        .eq('college_id', collegeId)
        .eq('programme_id', programmeId)
        .order('performance_score', { ascending: false })
        .limit(5);

      if (essaysError) {
        console.error('Error fetching successful essays:', essaysError);
      }

      // Construct RAG context if we have successful essays
      if (successfulEssays && successfulEssays.length > 0) {
        ragContext = successfulEssays.map((essay, idx) => `
Example Essay ${idx + 1} (Score: ${essay.performance_score}/100):
${essay.essay_content.substring(0, 500)}...

Key Strategies Used:
${JSON.stringify(essay.key_strategies, null, 2)}
`).join('\n\n---\n\n');
      } else {
        ragContext = 'No successful essays available for this college and programme combination. Providing general editorial guidance.';
      }
    }

    // Build specialized prompt
    const systemPrompt = `You are an expert editor for Sandwich, a college essay editing platform. Your role is to provide editorial feedback based on patterns from successful essays.

Style Guidelines:
- ${englishVariant === 'british' ? 'British' : 'American'} English spelling and grammar
- NO em dashes (—) - use commas, periods, or semicolons instead
- Short, punchy sentences
- Active voice preferred
- Clear, direct language
- Personal and authentic tone

Your task: Analyze the essay and provide specific, actionable feedback organized into three categories:
1. CRITICAL: Issues that must be fixed (grammar errors, unclear sentences, contradictions)
2. ENHANCEMENT: Suggestions to strengthen impact (better word choice, tighter phrasing, stronger examples)
3. PERSONALIZATION: Opportunities to add unique voice or connect to CV/profile data

Base your feedback on patterns from successful essays provided in the context.`;

    const userPrompt = `
SUCCESSFUL ESSAYS CONTEXT:
${ragContext}

${cvData ? `\nWRITER'S CV DATA:\n${JSON.stringify(cvData, null, 2)}\n` : ''}

ESSAY TO ANALYZE:
${content}

Please analyze this essay and provide editorial feedback. For each suggestion, identify:
- The exact text that needs attention (with character positions)
- What the issue is
- A specific suggested rewrite
- Why this matters (based on successful essay patterns)
- Evidence from the successful essays that supports this recommendation`;

    // Call Lovable AI with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_editorial_feedback',
              description: 'Return editorial feedback suggestions for the essay',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['critical', 'enhancement', 'personalization'],
                          description: 'Type of suggestion'
                        },
                        location: {
                          type: 'object',
                          properties: {
                            start: { type: 'number' },
                            end: { type: 'number' }
                          },
                          required: ['start', 'end']
                        },
                        originalText: { type: 'string' },
                        issue: { type: 'string' },
                        suggestion: { type: 'string' },
                        reasoning: { type: 'string' },
                        evidence: { type: 'string' }
                      },
                      required: ['type', 'location', 'originalText', 'issue', 'suggestion', 'reasoning', 'evidence'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['suggestions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_editorial_feedback' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Editorial feedback requires additional credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      throw new Error('Invalid AI response format');
    }

    const feedbackData = JSON.parse(toolCall.function.arguments);
    
    // Add unique IDs to suggestions
    const suggestionsWithIds = feedbackData.suggestions.map((s: any, idx: number) => ({
      id: `${Date.now()}-${idx}`,
      ...s
    }));

    return new Response(
      JSON.stringify({ suggestions: suggestionsWithIds }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-essay function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
