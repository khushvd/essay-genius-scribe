import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call Claude API
async function callClaudeAPI(systemPrompt: string, userPrompt: string, tools: any[]) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      })),
      tool_choice: { type: 'tool', name: 'provide_editorial_feedback' }
    }),
  });

  return response;
}

// Helper function to call Gemini API via Lovable AI Gateway
async function callGeminiAPI(systemPrompt: string, userPrompt: string, tools: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

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
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'provide_editorial_feedback' } }
    }),
  });

  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essayId, content, cvData } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch essay details including all metadata
    const { data: essayData, error: essayError } = await supabase
      .from('essays')
      .select(`
        *,
        colleges (
          id,
          name,
          tier,
          country
        ),
        programmes (
          id,
          name,
          english_variant
        )
      `)
      .eq('id', essayId)
      .single();

    if (essayError) {
      console.error('Error fetching essay:', essayError);
      return new Response(
        JSON.stringify({ error: 'Essay not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check: ensure user owns this essay
    if (essayData.writer_id !== user.id) {
      console.error('Authorization failed: User does not own this essay');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not have permission to analyze this essay' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const collegeId = essayData?.colleges?.id || null;
    const programmeId = essayData?.programmes?.id || null;
    const collegeTier = essayData?.colleges?.tier || 'standard';
    const englishVariant = essayData?.programmes?.english_variant || 'american';
    const degreeLevel = essayData?.degree_level || 'bachelors';
    const questionnaireData = essayData?.questionnaire_data;
    const customCollegeName = essayData?.custom_college_name;
    const customProgrammeName = essayData?.custom_programme_name;
    
    console.log('Essay analysis context:', { 
      collegeTier, 
      englishVariant, 
      degreeLevel,
      hasQuestionnaire: !!questionnaireData,
      isCustomCollege: !!customCollegeName
    });

    // Fetch successful essays only if college and programme are provided
    let ragContext = 'No specific college/programme context provided. Providing general editorial guidance based on best practices for college essays.';
    
    if (collegeId && programmeId) {
      const { data: successfulEssays, error: essaysError } = await supabase
        .from('successful_essays')
        .select('essay_content, key_strategies, performance_score, writer_resume, writer_questionnaire, essay_title, degree_level')
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
Example Essay ${idx + 1} (Score: ${essay.performance_score}/100)${essay.essay_title ? ` - "${essay.essay_title}"` : ''}${essay.degree_level ? ` [${essay.degree_level}]` : ''}:
${essay.essay_content.substring(0, 500)}...

${essay.writer_resume ? `Writer's Background:\n${essay.writer_resume.substring(0, 300)}...\n` : ''}
${essay.writer_questionnaire ? `Writer's Profile:\n${JSON.stringify(essay.writer_questionnaire, null, 2)}\n` : ''}
Key Strategies Used:
${JSON.stringify(essay.key_strategies, null, 2)}
`).join('\n\n---\n\n');
      } else {
        ragContext = 'No successful essays available for this college and programme combination. Providing general editorial guidance.';
      }
    }

    // Build specialized prompt with degree-level specific guidance
    const degreeGuidance = degreeLevel === 'masters' 
      ? `This is a Master's programme essay. Focus on:
- Professional goals and career trajectory
- Academic and research interests
- How the programme aligns with their career objectives
- Mature, goal-oriented narrative style
- Specific examples of relevant experience and expertise`
      : `This is a Bachelor's programme essay. Focus on:
- Personal growth and self-discovery
- Creative storytelling and authentic voice
- Character development and values
- Emotional resonance and relatability
- How experiences shaped their perspective`;

    const systemPrompt = `You are an expert editor for Sandwich, a college essay editing platform. Your role is to provide editorial feedback based on patterns from successful essays.

${degreeGuidance}

Style Guidelines:
- ${englishVariant === 'british' ? 'British' : 'American'} English spelling and grammar
- Humanised, conversational tone - avoid overly formal or robotic language
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

    const collegeContext = customCollegeName 
      ? `Target Institution: ${customCollegeName}${customProgrammeName ? ` - ${customProgrammeName}` : ''} (custom entry)`
      : `Target Institution: ${essayData?.colleges?.name || 'General'} - ${essayData?.programmes?.name || 'General'}`;

    const questionnaireContext = questionnaireData 
      ? `\nSTUDENT BACKGROUND QUESTIONNAIRE:
${questionnaireData.academicInterests ? `Academic Interests: ${questionnaireData.academicInterests}` : ''}
${questionnaireData.extracurriculars ? `Extracurricular Activities: ${questionnaireData.extracurriculars}` : ''}
${questionnaireData.careerGoals ? `Career Goals: ${questionnaireData.careerGoals}` : ''}
${questionnaireData.challenges ? `Personal Challenges/Growth: ${questionnaireData.challenges}` : ''}

Use this background to identify opportunities to:
- Connect essay themes to their stated interests and goals
- Suggest incorporating relevant experiences they've mentioned
- Ensure consistency between their background and essay narrative
- Personalize suggestions based on their unique story
`
      : '';

    const userPrompt = `
${collegeContext}

SUCCESSFUL ESSAYS CONTEXT:
${ragContext}

${cvData ? `\nWRITER'S CV/RESUME:\n${typeof cvData === 'string' ? cvData : JSON.stringify(cvData, null, 2)}\n` : ''}

${questionnaireContext}

ESSAY TO ANALYZE:
${content}

Please analyze this essay and provide editorial feedback with a humanised, conversational tone. For each suggestion, identify:
- The exact text that needs attention (with character positions)
- What the issue is
- A specific suggested rewrite (ensure it sounds natural and human, not robotic)
- Why this matters (based on successful essay patterns)
- Evidence from the successful essays that supports this recommendation
${questionnaireData ? '\n- How this connects to the student\'s background and goals (when relevant)' : ''}`;

    // Define tools schema for both APIs
    const tools = [
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
      },
      {
        type: 'function',
        function: {
          name: 'score_essay',
          description: 'Calculate quality scores for the essay across multiple dimensions',
          parameters: {
            type: 'object',
            properties: {
              overall_score: { 
                type: 'number',
                description: 'Overall essay quality score (0-100)'
              },
              clarity_score: { 
                type: 'number',
                description: 'How clear and understandable the essay is (0-100)'
              },
              impact_score: { 
                type: 'number',
                description: 'How impactful and memorable the essay is (0-100)'
              },
              authenticity_score: { 
                type: 'number',
                description: 'How authentic and personal the voice is (0-100)'
              },
              coherence_score: { 
                type: 'number',
                description: 'How well-structured and coherent the essay is (0-100)'
              },
              reasoning: { 
                type: 'string',
                description: 'Detailed explanation of the scores'
              }
            },
            required: ['overall_score', 'clarity_score', 'impact_score', 'authenticity_score', 'coherence_score', 'reasoning'],
            additionalProperties: false
          }
        }
      }
    ];

    // Determine which AI to use based on college tier
    const useClaude = collegeTier === 'premium';
    console.log(`Using ${useClaude ? 'Claude Sonnet 4' : 'Gemini 2.5 Flash'} for college tier: ${collegeTier}`);

    let aiResponse;
    let usingFallback = false;
    let modelUsed = useClaude ? 'claude-sonnet-4' : 'gemini-2.5-flash';

    try {
      if (useClaude) {
        aiResponse = await callClaudeAPI(systemPrompt, userPrompt, tools);
        
        // If Claude fails, fallback to Gemini
        if (!aiResponse.ok) {
          console.warn('Claude API failed, falling back to Gemini:', aiResponse.status);
          usingFallback = true;
          modelUsed = 'gemini-2.5-flash (fallback)';
          aiResponse = await callGeminiAPI(systemPrompt, userPrompt, tools);
        }
      } else {
        aiResponse = await callGeminiAPI(systemPrompt, userPrompt, tools);
      }
    } catch (error) {
      console.error('Primary AI call failed, attempting fallback:', error);
      usingFallback = true;
      modelUsed = 'gemini-2.5-flash (fallback)';
      aiResponse = await callGeminiAPI(systemPrompt, userPrompt, tools);
    }

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
    
    // Parse response based on which API was used
    let feedbackData;
    if (useClaude && !usingFallback) {
      // Claude format: content[].input
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      if (!toolUse) {
        console.error('No tool use in Claude response:', JSON.stringify(aiData));
        throw new Error('Invalid Claude response format');
      }
      feedbackData = toolUse.input;
    } else {
      // Gemini format: tool_calls[].function.arguments
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error('No tool call in Gemini response:', JSON.stringify(aiData));
        throw new Error('Invalid Gemini response format');
      }
      feedbackData = JSON.parse(toolCall.function.arguments);
    }
    
    // Add unique IDs to suggestions and create analysis ID
    const analysisId = `analysis-${Date.now()}`;
    const suggestionsWithIds = feedbackData.suggestions.map((s: any, idx: number) => ({
      id: `${Date.now()}-${idx}`,
      ...s
    }));

    // Generate essay score using second AI call
    const scorePrompt = `Based on the essay analysis, provide detailed quality scores.

Essay: ${content}

Feedback provided: ${JSON.stringify(feedbackData.suggestions, null, 2)}

Rate the essay on:
1. Overall quality (0-100)
2. Clarity of communication (0-100)
3. Impact and memorability (0-100)
4. Authenticity of voice (0-100)
5. Coherence and structure (0-100)

Provide detailed reasoning for each score.`;

    try {
      const scoreResponse = useClaude && !usingFallback
        ? await callClaudeAPI(systemPrompt, scorePrompt, tools)
        : await callGeminiAPI(systemPrompt, scorePrompt, tools);

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        let essayScores;

        if (useClaude && !usingFallback) {
          const scoreToolUse = scoreData.content?.find((c: any) => c.type === 'tool_use' && c.name === 'score_essay');
          essayScores = scoreToolUse?.input;
        } else {
          const scoreToolCall = scoreData.choices?.[0]?.message?.tool_calls?.find((tc: any) => tc.function.name === 'score_essay');
          if (scoreToolCall) {
            essayScores = JSON.parse(scoreToolCall.function.arguments);
          }
        }

        // Store scores in database
        if (essayScores) {
          const { error: scoreError } = await supabase
            .from('essay_scores')
            .insert({
              essay_id: essayId,
              score_type: 'initial',
              overall_score: Math.round(essayScores.overall_score),
              clarity_score: Math.round(essayScores.clarity_score),
              impact_score: Math.round(essayScores.impact_score),
              authenticity_score: Math.round(essayScores.authenticity_score),
              coherence_score: Math.round(essayScores.coherence_score),
              ai_reasoning: essayScores.reasoning,
              scored_by: user.id
            });

          if (scoreError) {
            console.error('Error storing essay scores:', scoreError);
          }
        }
      }
    } catch (scoreError) {
      console.error('Error generating essay scores:', scoreError);
      // Don't fail the entire request if scoring fails
    }

    return new Response(
      JSON.stringify({ 
        suggestions: suggestionsWithIds,
        analysisId,
        metadata: {
          model: modelUsed,
          collegeTier
        }
      }),
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
