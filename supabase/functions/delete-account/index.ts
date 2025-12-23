import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the authorization header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { targetUserId } = await req.json();

    // Check permissions
    if (targetUserId && targetUserId !== user.id) {
        // Checking if the requester is an admin
        // We can check the public profile or rely on metadata if set
        // Safe bet: check the profiles table
        const { data: requesterProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (requesterProfile?.role !== 'ADMIN') {
             return new Response(
                JSON.stringify({ error: 'Forbidden: Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
        }

        // Proceed to delete target user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            targetUserId
        );

        if (deleteError) {
             throw deleteError;
        }

        return new Response(
            JSON.stringify({ message: `User ${targetUserId} deleted successfully` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } else {
        // Self deletion
        // Verify it's the same user (implicitly handled by else block, but good to be clear)
        const userToDelete = targetUserId || user.id;
        
        if (userToDelete !== user.id) {
             // Should verify logic above covers this, but sanity check
              return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            userToDelete
        );

        if (deleteError) {
             throw deleteError;
        }

         return new Response(
            JSON.stringify({ message: 'Account deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
