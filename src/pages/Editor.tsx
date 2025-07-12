import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ContextEngineApp } from '@/components/ContextEngineApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (id) {
      fetchBlueprint();
    } else {
      setLoading(false);
    }
  }, [user, id, navigate]);

  const fetchBlueprint = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setBlueprint(data);
    } catch (error: any) {
      toast({
        title: "Error loading blueprint",
        description: error.message,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return <ContextEngineApp blueprint={blueprint} />;
}