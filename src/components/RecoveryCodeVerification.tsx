import React, { useState } from 'react';
import { Key, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RecoveryCodeVerificationProps {
  onBack: () => void;
}

export default function RecoveryCodeVerification({ onBack }: RecoveryCodeVerificationProps) {
  const { user } = useAuth();
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recoveryCode.trim()) {
      setError('Please enter a recovery code');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call Supabase API to verify the recovery code
      const { error: recoveryError } = await supabase.auth.mfa.challengeAndVerifyWithRecoveryCode({ 
        recoveryCode: recoveryCode.trim() 
      });
      
      if (recoveryError) {
        throw recoveryError;
      }
      
      setSuccess(true);
      
      // Redirect after successful verification (after showing success message)
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      console.error('Error verifying recovery code:', err);
      setError(err instanceof Error ? err.message : 'Invalid recovery code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-secondary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-brand-primary mb-2">
          Use Recovery Code
        </h1>
        <p className="text-brand-secondary-400">
          Enter one of your recovery codes to regain access to your account
        </p>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-md text-center">
          <p className="font-medium mb-2">Recovery code accepted!</p>
          <p>You'll be redirected to your dashboard shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="recovery-code" className="block text-sm font-medium text-brand-secondary-400 mb-1">
              Recovery Code
            </label>
            <input
              id="recovery-code"
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent font-mono"
              placeholder="Enter recovery code"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Example format: XXXX-XXXX-XXXX-XXXX
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !recoveryCode.trim()}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Verifying...
              </>
            ) : (
              'Verify Recovery Code'
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-secondary-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </form>
      )}
    </div>
  );
}
