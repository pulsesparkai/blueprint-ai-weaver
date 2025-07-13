import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
  description?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  subscription_tier: 'free' | 'pro' | 'enterprise';
}

interface Subscription {
  id: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any;
  teams: Team[];
  currentTeam: Team | null;
  subscription: Subscription | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  switchTeam: (teamId: string) => void;
  refreshSubscription: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data in background
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setTeams([]);
          setCurrentTeam(null);
          setSubscription(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      await Promise.all([
        fetchUserProfile(userId),
        fetchUserTeams(),
        fetchUserSubscription()
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const { data } = await supabase.functions.invoke('team-management', {
        body: { action: 'list-teams' }
      });

      if (data?.teams) {
        const formattedTeams = data.teams.map((tm: any) => ({
          id: tm.teams.id,
          name: tm.teams.name,
          description: tm.teams.description,
          role: tm.role,
          subscription_tier: tm.teams.subscription_tier
        }));
        
        setTeams(formattedTeams);
        
        // Set first team as current if none selected
        if (formattedTeams.length > 0 && !currentTeam) {
          setCurrentTeam(formattedTeams[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const { data } = await supabase.functions.invoke('subscription-management', {
        body: { 
          action: 'check-subscription',
          teamId: currentTeam?.id 
        }
      });

      if (data?.subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const refreshTeams = async () => {
    await fetchUserTeams();
  };

  const refreshSubscription = async () => {
    await fetchUserSubscription();
  };

  const switchTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      // Refresh subscription for new team context
      setTimeout(() => {
        fetchUserSubscription();
      }, 0);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    profile,
    teams,
    currentTeam,
    subscription,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    refreshTeams,
    switchTeam,
    refreshSubscription
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}