import React, { useState } from 'react';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FormInput from './FormInput';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Use Supabase's password reset method
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Specify the redirect URL for password reset 
        // This should be a page in your app that handles password reset
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-primary mb-2">Check your email</h1>
          <p className="text-brand-secondary-400">
            We've sent password reset instructions to {email}
          </p>
        </div>

        <Link
          to="/"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-secondary-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-secondary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-brand-primary mb-2">Reset your password</h1>
        <p className="text-brand-secondary-400">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          id="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Send Reset Instructions'
          )}
        </button>
        
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <Link
          to="/"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-secondary-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Link>
      </form>
    </div>
  );
}
