import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamRequest {
  action: 'create' | 'invite' | 'remove' | 'update-role' | 'accept-invitation' | 'list-teams' | 'list-invitations';
  teamId?: string;
  name?: string;
  description?: string;
  email?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  invitationToken?: string;
  memberId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const request: TeamRequest = await req.json();

    switch (request.action) {
      case 'create':
        return await createTeam(supabaseClient, user.id, request);
      case 'invite':
        return await inviteToTeam(supabaseClient, user.id, request);
      case 'remove':
        return await removeMember(supabaseClient, user.id, request);
      case 'update-role':
        return await updateMemberRole(supabaseClient, user.id, request);
      case 'accept-invitation':
        return await acceptInvitation(supabaseClient, user.id, user.email!, request);
      case 'list-teams':
        return await listUserTeams(supabaseClient, user.id);
      case 'list-invitations':
        return await listPendingInvitations(supabaseClient, user.email!);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Team management error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createTeam(supabaseClient: any, userId: string, request: TeamRequest) {
  // Get user's personal workspace
  const { data: workspace } = await supabaseClient
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_personal', true)
    .single();

  if (!workspace) {
    throw new Error('Personal workspace not found');
  }

  // Create new team
  const { data: team, error: teamError } = await supabaseClient
    .from('teams')
    .insert({
      name: request.name,
      description: request.description,
      workspace_id: workspace.id,
      owner_id: userId,
      subscription_tier: 'free'
    })
    .select()
    .single();

  if (teamError) throw teamError;

  // Add creator as owner
  await supabaseClient
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      email: (await supabaseClient.auth.getUser()).data.user?.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({ success: true, team }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function inviteToTeam(supabaseClient: any, userId: string, request: TeamRequest) {
  // Check if user has admin/owner permissions
  const { data: membership } = await supabaseClient
    .from('team_members')
    .select('role')
    .eq('team_id', request.teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabaseClient
    .from('team_invitations')
    .insert({
      team_id: request.teamId,
      email: request.email,
      role: request.role || 'member',
      invited_by: userId
    })
    .select()
    .single();

  if (inviteError) throw inviteError;

  // TODO: Send invitation email
  console.log(`Invitation sent to ${request.email} for team ${request.teamId}`);

  return new Response(
    JSON.stringify({ success: true, invitation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function removeMember(supabaseClient: any, userId: string, request: TeamRequest) {
  // Check permissions
  const { data: membership } = await supabaseClient
    .from('team_members')
    .select('role')
    .eq('team_id', request.teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  // Remove member
  const { error } = await supabaseClient
    .from('team_members')
    .delete()
    .eq('id', request.memberId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateMemberRole(supabaseClient: any, userId: string, request: TeamRequest) {
  // Check permissions
  const { data: membership } = await supabaseClient
    .from('team_members')
    .select('role')
    .eq('team_id', request.teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Only team owners can change roles');
  }

  // Update role
  const { error } = await supabaseClient
    .from('team_members')
    .update({ role: request.role })
    .eq('id', request.memberId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function acceptInvitation(supabaseClient: any, userId: string, userEmail: string, request: TeamRequest) {
  // Find invitation
  const { data: invitation } = await supabaseClient
    .from('team_invitations')
    .select('*')
    .eq('invitation_token', request.invitationToken)
    .eq('email', userEmail)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Add user to team
  await supabaseClient
    .from('team_members')
    .insert({
      team_id: invitation.team_id,
      user_id: userId,
      email: userEmail,
      role: invitation.role,
      status: 'active',
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      joined_at: new Date().toISOString()
    });

  // Mark invitation as accepted
  await supabaseClient
    .from('team_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return new Response(
    JSON.stringify({ success: true, teamId: invitation.team_id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listUserTeams(supabaseClient: any, userId: string) {
  const { data: teams } = await supabaseClient
    .from('team_members')
    .select(`
      team_id,
      role,
      status,
      joined_at,
      teams (
        id,
        name,
        description,
        subscription_tier,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  return new Response(
    JSON.stringify({ teams: teams || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listPendingInvitations(supabaseClient: any, userEmail: string) {
  const { data: invitations } = await supabaseClient
    .from('team_invitations')
    .select(`
      *,
      teams (
        name,
        description
      )
    `)
    .eq('email', userEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  return new Response(
    JSON.stringify({ invitations: invitations || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}