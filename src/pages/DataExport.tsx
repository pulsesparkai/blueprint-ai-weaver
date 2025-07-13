import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const DataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Call the GDPR export function
      const { data, error } = await supabase.rpc('export_user_data', {
        p_user_id: user.id
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      if (error) {
        throw error;
      }

      // Create and download the export file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported successfully",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Call the GDPR deletion function
      const { error } = await supabase.rpc('delete_user_data', {
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({
        title: "Deletion failed",
        description: "There was an error deleting your account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Data Management</CardTitle>
          <p className="text-muted-foreground">
            Manage your personal data in compliance with GDPR regulations.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Export Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Export Your Data</h3>
            <p className="text-sm text-muted-foreground">
              Download a complete copy of all your personal data stored in our system. 
              This includes your profile, pipelines, integrations, and usage history.
            </p>
            
            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting data...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={handleExportData} 
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </Button>
          </div>

          {/* Data Portability Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The exported data will be in JSON format and will include all information 
              associated with your account. This file may contain sensitive information, 
              so please store it securely.
            </AlertDescription>
          </Alert>

          {/* Account Deletion Section */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Deleting your account will permanently remove:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your profile and account information</li>
                  <li>All pipelines and configurations</li>
                  <li>Integration settings and API keys</li>
                  <li>Usage history and analytics data</li>
                  <li>Team memberships and collaborations</li>
                </ul>
              </AlertDescription>
            </Alert>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isDeletingAccount}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeletingAccount ? 'Deleting Account...' : 'Delete My Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers. All pipelines, integrations,
                    and team collaborations will be lost forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Your Rights Section */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold">Your Data Rights</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Under GDPR, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Access your personal data (export functionality above)</li>
                <li>Rectify inaccurate data (edit your profile)</li>
                <li>Erase your personal data (delete account above)</li>
                <li>Restrict or object to processing</li>
                <li>Data portability (export functionality above)</li>
              </ul>
              <p className="mt-4">
                For questions about your data rights or to make additional requests, 
                please contact us at privacy@yourcompany.com
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExport;