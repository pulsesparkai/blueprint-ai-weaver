import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus, 
  Mail, 
  Crown, 
  Shield, 
  User, 
  Eye, 
  MoreHorizontal,
  Trash2,
  Settings,
  UserPlus
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: string;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  expires_at: string;
  teams: {
    name: string;
    description: string;
  };
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye
};

const ROLE_COLORS = {
  owner: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-purple-100 text-purple-800',
  member: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800'
};

export default function TeamManagement() {
  const { currentTeam, refreshTeams } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: ''
  });
  
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'member' as 'owner' | 'admin' | 'member' | 'viewer'
  });

  useEffect(() => {
    fetchTeamMembers();
    fetchPendingInvitations();
  }, [currentTeam]);

  const fetchTeamMembers = async () => {
    if (!currentTeam) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', currentTeam.id)
        .eq('status', 'active');
      
      if (error) throw error;
      setMembers((data || []) as TeamMember[]);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const { data } = await supabase.functions.invoke('team-management', {
        body: { action: 'list-invitations' }
      });
      
      if (data?.invitations) {
        setInvitations(data.invitations);
      }
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: {
          action: 'create',
          name: newTeam.name,
          description: newTeam.description
        }
      });

      if (error) throw error;

      toast({
        title: "Team created",
        description: `${newTeam.name} has been created successfully`
      });

      setNewTeam({ name: '', description: '' });
      setShowCreateTeam(false);
      await refreshTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!newInvite.email.trim() || !currentTeam) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('team-management', {
        body: {
          action: 'invite',
          teamId: currentTeam.id,
          email: newInvite.email,
          role: newInvite.role
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${newInvite.email}`
      });

      setNewInvite({ email: '', role: 'member' });
      setShowInviteModal(false);
      await fetchTeamMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentTeam) return;

    try {
      const { error } = await supabase.functions.invoke('team-management', {
        body: {
          action: 'remove',
          teamId: currentTeam.id,
          memberId
        }
      });

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "Team member has been removed"
      });

      await fetchTeamMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!currentTeam) return;

    try {
      const { error } = await supabase.functions.invoke('team-management', {
        body: {
          action: 'update-role',
          teamId: currentTeam.id,
          memberId,
          role: newRole
        }
      });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "Member role has been updated"
      });

      await fetchTeamMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="w-4 h-4" />;
  };

  const isOwner = currentTeam?.role === 'owner';
  const isAdmin = currentTeam?.role === 'admin' || isOwner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">
            {currentTeam ? `Manage ${currentTeam.name}` : 'Manage your teams and collaborators'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to collaborate with others
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="teamDescription">Description (Optional)</Label>
                  <Input
                    id="teamDescription"
                    placeholder="Describe your team"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam} disabled={loading}>
                  {loading ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {currentTeam && isAdmin && (
            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {currentTeam.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={newInvite.email}
                      onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newInvite.role} onValueChange={(value: any) => setNewInvite(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={loading}>
                    {loading ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Current Team Members */}
      {currentTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Members of {currentTeam.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{member.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={ROLE_COLORS[member.role]}>
                      {getRoleIcon(member.role)}
                      <span className="ml-1 capitalize">{member.role}</span>
                    </Badge>
                    
                    {isOwner && member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'admin')}>
                            <Shield className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'member')}>
                            <User className="w-4 h-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'viewer')}>
                            <Eye className="w-4 h-4 mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Team invitations you've received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{invitation.teams.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.teams.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={ROLE_COLORS[invitation.role]}>
                      {getRoleIcon(invitation.role)}
                      <span className="ml-1 capitalize">{invitation.role}</span>
                    </Badge>
                    <Button size="sm">
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}