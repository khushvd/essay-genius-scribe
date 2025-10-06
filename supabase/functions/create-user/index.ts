import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, fullName, role, password } = await req.json();

    if (!email || !fullName || !role || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Profile is created by trigger, update account_status
    // Admins are auto-approved, others need approval
    if (role === 'admin') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          account_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', newUser.user.id);

      if (updateError) {
        console.error('Error updating profile status:', updateError);
      }
    }

    // Assign role (use UPSERT to prevent duplicate key errors)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        role: role
      }, {
        onConflict: 'user_id'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ error: 'User created but role assignment failed', userId: newUser.user.id }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log entry for admin user creation
    if (role === 'admin') {
      const { error: auditError } = await supabaseAdmin
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'create_admin_user',
          target_user_id: newUser.user.id,
          details: {
            email: email,
            full_name: fullName,
            role: role,
            timestamp: new Date().toISOString()
          }
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the request if audit logging fails
      }
    }

    // Send invite email
    try {
      await supabaseAdmin.functions.invoke('send-user-emails', {
        body: {
          type: 'invite',
          recipientEmail: email,
          recipientName: fullName,
          temporaryPassword: password,
        }
      });
    } catch (emailError) {
      console.error('Error sending invite email:', emailError);
      // Don't fail if email doesn't send
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
          role: role
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
