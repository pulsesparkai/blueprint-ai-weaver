import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  Copy, 
  Link, 
  Users, 
  Eye, 
  Edit, 
  Settings, 
  Calendar,
  ExternalLink,
  UserPlus,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShareModalProps {
  blueprintId: string;
  blueprintTitle: string;
  isOpen: boolean;
  onClose: () => void;
  userTier?: string;
}

// Supabase database types (snake_case)
interface ShareLinkDB {
  id: string;
  blueprint_id: string;
  created_by: string;
  share_type: 'public' | 'private' | 'team';
  access_level: 'view' | 'edit' | 'admin';
  expires_at: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
}

// Frontend types (camelCase)
interface ShareLink {
  id: string;
  shareType: 'public' | 'private' | 'team';
  accessLevel: 'view' | 'edit' | 'admin';
  shareToken: string;
  expiresAt?: string;
  createdAt: string;
}

// Type for new share form
type ShareFormData = {
  shareType: 'public' | 'private' | 'team';
  accessLevel: 'view' | 'edit' | 'admin';
  expiresAt: string;
};

// Transform database data to frontend format
const transformShareLink = (dbLink: ShareLinkDB): ShareLink => ({
  id: dbLink.id,
  shareType: dbLink.share_type,
  accessLevel: dbLink.access_level,
  shareToken: dbLink.share_token,
  expiresAt: dbLink.expires_at || undefined,
  createdAt: dbLink.created_at,
});

export function ShareModal({ blueprintId, blueprintTitle, isOpen, onClose, userTier = 'free' }: ShareModalProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newShare, setNewShare] = useState<ShareFormData>({
    shareType: 'private',
    accessLevel: 'view',
    expiresAt: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchShareLinks();
    }
  }, [isOpen, blueprintId]);

  const fetchShareLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprint_shares')
        .select('*')
        .eq('blueprint_id', blueprintId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform database data to frontend format
      const transformedData = (data as ShareLinkDB[] || []).map(transformShareLink);
      setShareLinks(transformedData);
    } catch (error) {
      console.error('Error fetching share links:', error);
    }
  };

  const createShareLink = async () => {
    if (userTier === 'free' && shareLinks.length >= 2) {
      toast({
        title: 'Upgrade Required',
        description: 'Free tier is limited to 2 share links. Upgrade to Pro for unlimited sharing.',
        variant: 'destructive',
      });
      return;
    }

    if (newShare.shareType === 'team' && userTier !== 'enterprise') {
      toast({
        title: 'Enterprise Feature',
        description: 'Team sharing is available in Enterprise tier only.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const shareData = {
        blueprint_id: blueprintId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        share_type: newShare.shareType,
        access_level: newShare.accessLevel,
        expires_at: newShare.expiresAt || null,
      };

      const { data, error } = await supabase
        .from('blueprint_shares')
        .insert(shareData)
        .select()
        .single();

      if (error) throw error;

      // Transform and add the new share link
      const transformedData = transformShareLink(data as ShareLinkDB);
      setShareLinks(prev => [transformedData, ...prev]);
      setNewShare({ shareType: 'private', accessLevel: 'view', expiresAt: '' });
      
      toast({
        title: 'Share Link Created',
        description: 'Your blueprint share link has been generated.',
      });
    } catch (error) {
      console.error('Error creating share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to create share link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link Copied',
      description: 'Share link has been copied to clipboard.',
    });
  };

  const deleteShareLink = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('blueprint_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      setShareLinks(prev => prev.filter(link => link.id !== shareId));
      toast({
        title: 'Share Link Deleted',
        description: 'The share link has been removed.',
      });
    } catch (error) {
      console.error('Error deleting share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete share link.',
        variant: 'destructive',
      });
    }
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share "{blueprintTitle}"
          </DialogTitle>
          <DialogDescription>
            Create shareable links to collaborate on this blueprint
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Share */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Share Link</CardTitle>
              <CardDescription>
                Generate a new link to share this blueprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Share Type</Label>
                  <Select
                    value={newShare.shareType}
                    onValueChange={(value: 'public' | 'private' | 'team') => 
                      setNewShare(prev => ({ ...prev, shareType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Public - Anyone with link
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Private - Specific users only
                        </div>
                      </SelectItem>
                      <SelectItem 
                        value="team" 
                        disabled={userTier !== 'enterprise'}
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4" />
                          Team - Enterprise only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={newShare.accessLevel}
                    onValueChange={(value: 'view' | 'edit' | 'admin') => 
                      setNewShare(prev => ({ ...prev, accessLevel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Only
                        </div>
                      </SelectItem>
                      <SelectItem value="edit">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Can Edit
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Full Access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newShare.expiresAt}
                  onChange={(e) => setNewShare(prev => ({ ...prev, expiresAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <Button 
                onClick={createShareLink} 
                disabled={isLoading}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Share Link'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Share Links */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Existing Share Links</h3>
              <Badge variant="outline">{shareLinks.length} active</Badge>
            </div>

            {shareLinks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No share links created yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <Card key={link.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="capitalize">
                              {link.shareType}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {link.accessLevel}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              Expires: {formatExpiryDate(link.expiresAt)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                              {window.location.origin}/shared/{link.shareToken}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyShareLink(link.shareToken)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/shared/${link.shareToken}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteShareLink(link.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Tier Limitations */}
          {userTier === 'free' && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Crown className="w-4 h-4" />
                  <span className="font-medium">Free Tier Limitations</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  • Maximum 2 share links
                  • No team sharing
                  • Basic access controls
                </p>
                <Button size="sm" className="mt-2" onClick={() => window.open('/billing', '_blank')}>
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
