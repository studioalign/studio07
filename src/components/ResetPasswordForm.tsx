import React, { useState, useEffect } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FormInput from './FormInput';

export default function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check for password reset token on component mount
  useEffect(() => {
    const checkResetToken = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        // No active session or token
        navigate('/forgot-password');
      }
    };

    checkResetToken();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Reset successful
      setSuccess(true);

      // Redirect to sign-in after a short delay
      setTimeout(() => {
        navigate('/'); // Changed from '/signin' to '/' to match your root login page
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to reset password. Please try again.'
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
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-brand-primary mb-2">Password Reset</h1>
          <p className="text-brand-secondary-400">
            Your password has been successfully reset.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to sign-in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-secondary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold text-brand-primary mb-2">Reset Password</h1>
        <p className="text-brand-secondary-400">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-6">
        <FormInput
          id="newPassword"
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="Enter new password"
        />

        <FormInput
          id="confirmPassword"
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm new password"
        />
        
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !newPassword || !confirmPassword}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}
