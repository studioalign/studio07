import React, { useState } from 'react';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RecoveryCodeVerification from './RecoveryCodeVerification';

interface MfaVerificationProps {
  onBack: () => void;
}

export default function MfaVerification({ onBack }: MfaVerificationProps) {
  const { verifyMfaCode } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // Handle input changes and filter to only include digits
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers (digits)
    const value = e.target.value.replace(/\D/g, '');
    
    // Limit to 6 digits
    if (value.length <= 6) {
      setVerificationCode(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await verifyMfaCode(verificationCode);
      
      if (!result.success) {
        throw new Error(result.error || 'Verification failed. Please try again.');
      }
      
      // Verification successful - the AuthContext will handle the session update
    } catch (err) {
      console.error('Error verifying MFA code:', err);
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show recovery code verification if selected
  if (useRecoveryCode) {
    return <RecoveryCodeVerification onBack={() => setUseRecoveryCode(false)} />;
  }

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-secondary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-brand-primary mb-2">
          Two-Factor Authentication
        </h1>
        <p className="text-brand-secondary-400">
          Enter the 6-digit verification code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-brand-secondary-400 mb-1">
            Verification Code
          </label>
          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={verificationCode}
            onChange={handleCodeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent text-center text-xl tracking-widest"
            placeholder="123456"
            maxLength={6}
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || verificationCode.length !== 6}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-secondary-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </button>
      </form>

      <div className="mt-8 text-sm text-center text-gray-500">
        <p>Lost access to your authenticator app?</p>
        <button 
          onClick={() => setUseRecoveryCode(true)}
          className="text-brand-primary hover:text-brand-secondary-400 font-medium">
          Use a recovery code
        </button>
      </div>
    </div>
  );
}
