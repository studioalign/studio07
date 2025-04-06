import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

/**
 * AuthCallbackPage handles redirects from email confirmations (signup/password reset)
 * and properly routes users based on their role and authentication status
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        setIsProcessing(true);
        
        // Get the URL hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Process the authentication confirmation
        const { data, error } = await supabase.auth.getSession();

        // Check if there was an error or no session
        if (error) {
          throw error;
        }

        if (!data.session) {
          // No session means the user hasn't been confirmed yet
          // Try to exchange the auth token for a session
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            // Use the tokens to establish a session
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (setSessionError) {
              throw setSessionError;
            }
          } else {
            console.error('No access token in URL');
            throw new Error('Authentication failed. Please try signing in again.');
          }
        }
        
        // At this point we should have an authenticated user
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData.user) {
          throw new Error('User authentication failed');
        }

        // Get the user's profile to check their role
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', userData.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // Redirect based on role
        if (userProfile?.role === 'owner') {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Authentication callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsProcessing(false);
        // After a delay, redirect to sign in
        setTimeout(() => navigate('/'), 5000);
      }
    }

    handleAuthCallback();
  }, [navigate]);

  // If already authenticated and we know the profile role, redirect immediately
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'owner' && (!profile.studio || !profile.studio.name)) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, profile, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-brand-primary mb-2">
                Confirming your account
              </h1>
              <p className="text-brand-secondary-400">
                Please wait while we authenticate your account...
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                Authentication Error
              </h1>
              <p className="text-red-500 mb-4">{error}</p>
              <p className="text-brand-secondary-400">
                Redirecting to sign in page in 5 seconds...
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center px-4 py-2 text-brand-primary hover:text-brand-secondary-400"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Sign In
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
