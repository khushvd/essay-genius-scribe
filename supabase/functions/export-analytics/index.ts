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
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the authenticated user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch analytics data with essay details
    const { data: analytics, error: analyticsError } = await supabase
      .from('essay_analytics')
      .select(`
        *,
        essays (
          title,
          writer_id,
          profiles (
            full_name,
            email
          )
        )
      `)
      .order('action_timestamp', { ascending: false });

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to CSV
    const headers = [
      'Timestamp',
      'Essay Title',
      'Writer Name',
      'Writer Email',
      'Analysis ID',
      'Suggestion ID',
      'Suggestion Type',
      'Action',
      'Original Text',
      'Suggested Text',
      'Reasoning'
    ];

    const csvRows = [headers.join(',')];

    for (const row of analytics) {
      const essay = row.essays as any;
      const profile = essay?.profiles as any;
      
      const csvRow = [
        row.action_timestamp,
        essay?.title || '',
        profile?.full_name || '',
        profile?.email || '',
        row.analysis_id,
        row.suggestion_id,
        row.suggestion_type,
        row.action,
        `"${(row.original_text || '').replace(/"/g, '""')}"`,
        `"${(row.suggested_text || '').replace(/"/g, '""')}"`,
        `"${(row.reasoning || '').replace(/"/g, '""')}"`
      ];
      
      csvRows.push(csvRow.join(','));
    }

    const csv = csvRows.join('\n');

    return new Response(
      csv,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="essay-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        } 
      }
    );

  } catch (error) {
    console.error('Error in export-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
