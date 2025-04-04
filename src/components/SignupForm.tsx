import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FormInput from './FormInput';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('owner');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateErrorDetected, setRateErrorDetected] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      // First, check if the user already exists
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (existingUser) {
        throw new Error('An account with this email already exists');
      }
      
      // If there was a rate limit error previously, suggest using a different email
      if (rateErrorDetected) {
        throw new Error('Please try using a different email address or try again later');
      }
      
      // Sign up with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });
      
      if (signupError) {
        console.error('Signup error:', signupError);
        
        // Detect rate limiting errors
        if (signupError.message.includes('rate limit') || signupError.status === 429) {
          setRateErrorDetected(true);
          throw new Error('Too many signup attempts. Please try again in a few minutes or use a different email address.');
        }
        
        throw signupError;
      }
      
      console.log('Signup successful:', data);
      
      // Create user record in users table
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user?.id,
            email,
            name,
            role,
            created_at: new Date().toISOString(),
          },
        ]);
      
      if (insertError) {
        console.error('Error creating user record:', insertError);
        // We'll still let them continue since the auth account was created
      }
      
      // Redirect to onboarding page
      navigate('/onboarding');
    } catch (err) {
      console.error('Error in signup:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-primary">Create Your Account</h1>
        <p className="text-brand-secondary-400 mt-2">
          Get started with StudioAlign today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          id="name"
          type="text"
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <FormInput
          id="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <FormInput
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <FormInput
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
            I am a:
          </label>
          <div className="grid grid-cols-3 gap-4">
            <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
              role === 'owner' ? 'bg-brand-secondary-100/10 border-brand-primary' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                value="owner"
                checked={role === 'owner'}
                onChange={() => setRole('owner')}
                className="sr-only"
              />
              <span className={`${role === 'owner' ? 'text-brand-primary' : 'text-gray-700'}`}>
                Studio Owner
              </span>
            </label>
            <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
              role === 'teacher' ? 'bg-brand-secondary-100/10 border-brand-primary' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                value="teacher"
                checked={role === 'teacher'}
                onChange={() => setRole('teacher')}
                className="sr-only"
              />
              <span className={`${role === 'teacher' ? 'text-brand-primary' : 'text-gray-700'}`}>
                Teacher
              </span>
            </label>
            <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
              role === 'parent' ? 'bg-brand-secondary-100/10 border-brand-primary' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                value="parent"
                checked={role === 'parent'}
                onChange={() => setRole('parent')}
                className="sr-only"
              />
              <span className={`${role === 'parent' ? 'text-brand-primary' : 'text-gray-700'}`}>
                Parent
              </span>
            </label>
          </div>
        </div>

        {rateErrorDetected && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You may have reached the signup rate limit. Consider using a different email address or try again later.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !name || !email || !password || !confirmPassword}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign Up'
          )}
        </button>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/" className="font-medium text-brand-primary hover:text-brand-secondary-400">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
