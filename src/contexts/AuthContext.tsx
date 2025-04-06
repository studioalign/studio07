import { createContext, useContext, useEffect, useState } from "react";
import { AuthResponse, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserData } from "../types/auth";

interface AuthContextType {
  user: User | null;
  profile: UserData | null;
  loading: boolean;
  mfaAuthenticationInProgress: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    needsMfa: boolean;
    error?: string;
  }>;
  verifyMfaCode: (code: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  mfaAuthenticationInProgress: false,
  signOut: async () => {},
  signIn: async () => ({ success: false, needsMfa: false }),
  verifyMfaCode: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null);
  const [mfaAuthenticationInProgress, setMfaAuthenticationInProgress] = useState(false);

  // console.log(profile);

  useEffect(() => {
    let mounted = true;
  
    const loadProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select(
            `id, name, role, email, photo_url,
            studio:studios!users_studio_id_fkey(
              id, name, address, phone, email, country, currency, timezone, stripe_connect_id, stripe_connect_enabled, stripe_connect_onboarding_complete, bank_account_name, bank_account_last4
            )
          `
          )
          .eq("id", userId)
          .single();
  
        if (error) {
          console.error('Error loading profile:', error);
          if (mounted) setProfile(null);
        } else if (mounted) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        if (mounted) setProfile(null);
      }
    };
  
    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
  
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await loadProfile(currentUser.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error during session initialization:', error);
        if (mounted) setLoading(false);
      }
    };
  
    initializeSession();
  
    const authSubscription = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      }
    );
  
    return () => {
      mounted = false;
      authSubscription.data.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("Signing in..."); // Add debugging

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        console.error("Sign in error:", response.error); // Add debugging
        return { 
          success: false, 
          needsMfa: false, 
          error: response.error.message 
        };
      }

      // Check if MFA is required
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If currentLevel is not aal2 (and nextLevel is aal2), MFA verification is needed
      if (mfaData.currentLevel !== 'aal2' && mfaData.nextLevel === 'aal2') {
        setAuthResponse(response);
        setMfaAuthenticationInProgress(true);
        return { 
          success: true, 
          needsMfa: true 
        };
      }

      // MFA not required or already completed
      return { 
        success: true, 
        needsMfa: false 
      };
    } catch (error) {
      console.error("Error in sign in:", error);
      return { 
        success: false, 
        needsMfa: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  };

  const verifyMfaCode = async (code: string) => {
    try {
      // Get MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;
      
      // Find the first verified TOTP factor
      const totpFactor = factorsData.totp.find(factor => factor.status === 'verified');
      
      if (!totpFactor) {
        return { 
          success: false, 
          error: 'No MFA factor found' 
        };
      }
      
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the challenge with the code
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });
      
      if (verifyError) {
        return { 
          success: false, 
          error: verifyError.message 
        };
      }
      
      // MFA verification successful - reset state
      setMfaAuthenticationInProgress(false);
      
      // Check current session to ensure we're properly logged in
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return {
          success: false,
          error: 'Session not established after MFA verification'
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error verifying MFA code:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred during verification' 
      };
    }
  };
      
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the challenge with the code
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });
      
      if (verifyError) {
        return { 
          success: false, 
          error: verifyError.message 
        };
      }
      
      // MFA verification successful
      setMfaAuthenticationInProgress(false);
      return { success: true };
    } catch (error) {
      console.error("Error verifying MFA code:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred during verification' 
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      mfaAuthenticationInProgress,
      signIn, 
      verifyMfaCode,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
