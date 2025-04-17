import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, AlertTriangle, Lock, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FormInput from '../FormInput';
import TwoFactorSettings from './TwoFactorSettings'; // Import the new component

export default function Settings() {
  const { profile, signOut } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState({
    classUpdates: true,
    messages: true,
    billing: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Studio owner specific states
  const [hasOtherOwners, setHasOtherOwners] = useState(false);
  const [deleteStudioWithAccount, setDeleteStudioWithAccount] = useState(true);
  const [isCheckingOwners, setIsCheckingOwners] = useState(false);

  // Check for other owners in the studio
  const checkForOtherOwners = async (userId: string, studioId: string) => {
    setIsCheckingOwners(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('studio_id', studioId)
        .eq('role', 'owner')
        .neq('id', userId);

      if (error) throw error;

      setHasOtherOwners(data && data.length > 0);
    } catch (err) {
      console.error('Error checking for other owners:', err);
      setHasOtherOwners(false);
    } finally {
      setIsCheckingOwners(false);
    }
  };

  // Fetch user preferences when component mounts
  useEffect(() => {
    if (!profile?.id) return;
    
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', profile.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', error);
          return;
        }
        
        if (data) {
          setEmailNotifications({
            classUpdates: data.email_class_updates ?? true,
            messages: data.email_messages ?? true,
            billing: data.email_billing ?? true,
          });
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
      }
    };
    
    fetchPreferences();
    
    // If the user is a studio owner, check if there are other owners
    if (profile.role === 'owner' && profile.studio?.id) {
      checkForOtherOwners(profile.id, profile.studio.id);
    }
  }, [profile?.id, profile?.role, profile?.studio?.id]);

  // Handle saving notification preferences
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!profile?.id) {
        throw new Error('User not authenticated');
      }
      
      // Use .upsert with on conflict clause to handle existing records
      const { data, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: profile.id,
            email_class_updates: emailNotifications.classUpdates,
            email_messages: emailNotifications.messages,
            email_billing: emailNotifications.billing,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false,
            returning: 'minimal'
          }
        );

      if (upsertError) throw upsertError;
      
      setSuccess('Notification settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    // Validate password inputs
    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      setIsSubmitting(false);
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords don't match");
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      // Clear form and show success message
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setPasswordChangeSuccess(true);
      setSuccess('Password changed successfully');
      
      // Close password form after a delay
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordChangeSuccess(false);
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'delete my account') {
      setError('Please type "delete my account" to confirm');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!profile?.id) {
        throw new Error('User not authenticated');
      }

      // For parents, delete associated students first
      if (profile.role === 'parent') {
        const { error: studentDeleteError } = await supabase
          .from('students')
          .delete()
          .eq('parent_id', profile.id);

        if (studentDeleteError) {
          console.error('Error deleting students:', studentDeleteError);
          throw studentDeleteError;
        }
      }

      // Generate a unique email for deleted users to mark the record in public.users
      const deletedEmail = `deleted_user_${profile.id}_${Date.now()}@deleted.studioalign.com`;

      // Update user record with deletion information in public.users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: 'Deleted User',
          email: deletedEmail,
          photo_url: null,
          phone: null,
          role: 'deleted',
          studio_id: null,
          deleted_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Call the serverless function to handle the auth user's email randomization
      // This will free up the email address for reuse
      try {
        const response = await fetch('/.netlify/functions/delete-auth-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: profile.id,
            email: deletedEmail 
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          console.warn('Auth user email randomization via function had issues:', data.error);
          // We'll continue even if this fails, as the public.users record is updated
        } else {
          console.log('Auth user email successfully randomized via serverless function');
        }
      } catch (functionError) {
        console.warn('Error calling auth user email randomization function:', functionError);
        // Continue with the process even if the serverless function fails
      }

      // Sign out the user
      await supabase.auth.signOut();

      // Force redirection to sign-in page
      window.location.href = '/';

    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If profile is not loaded yet, show loading state
  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{success}</span>
          </div>
        )}
        
        {/* Global error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Two-Factor Authentication Section */}
        <TwoFactorSettings />

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            <div>
              <h3 className="text-lg font-medium text-brand-primary mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Email Notifications
              </h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailNotifications.classUpdates}
                    onChange={(e) => setEmailNotifications(prev => ({
                      ...prev,
                      classUpdates: e.target.checked
                    }))}
                    className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-gray-700">Class updates and changes</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailNotifications.messages}
                    onChange={(e) => setEmailNotifications(prev => ({
                      ...prev,
                      messages: e.target.checked
                    }))}
                    className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-gray-700">New messages</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailNotifications.billing}
                    onChange={(e) => setEmailNotifications(prev => ({
                      ...prev,
                      billing: e.target.checked
                    }))}
                    className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-gray-700">Billing and payment updates</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-brand-primary mr-2" />
            <h3 className="text-lg font-medium text-brand-primary">Security</h3>
          </div>
          
          <div className="space-y-4 max-w-lg">
            {/* Password Change Form */}
            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-2 text-left text-brand-primary hover:bg-gray-50 rounded-md"
              >
                Change Password
              </button>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium mb-3 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </h4>
                
                {passwordChangeSuccess ? (
                  <div className="flex items-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    Password changed successfully!
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <FormInput
                      id="currentPassword"
                      type="password"
                      label="Current Password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                      required
                    />
                    
                    <FormInput
                      id="newPassword"
                      type="password"
                      label="New Password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                      required
                    />
                    
                    <FormInput
                      id="confirmPassword"
                      type="password"
                      label="Confirm New Password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                      required
                    />
                    
                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
                      >
                        {isSubmitting ? 'Saving...' : 'Update Password'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                        }}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-500">Delete Account</h3>
          </div>
          
          <div style={{ maxWidth: '100%' }}>
            <p className="text-gray-600 mb-4" style={{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                {/* Studio owner specific options */}
                {profile?.role === 'owner' && (
                  <div className="p-4 bg-gray-50 rounded-md mb-2">
                    <h4 className="font-medium mb-2">Studio Owner Options</h4>
                    
                    {isCheckingOwners ? (
                      <p className="text-sm text-gray-500">Checking for other studio owners...</p>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={deleteStudioWithAccount}
                              onChange={() => setDeleteStudioWithAccount(true)}
                              className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Delete my account and the entire studio (including all teacher and parent accounts)
                            </span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={!deleteStudioWithAccount}
                              onChange={() => setDeleteStudioWithAccount(false)}
                              disabled={!hasOtherOwners}
                              className={`h-4 w-4 border-gray-300 focus:ring-red-500 ${
                                hasOtherOwners ? 'text-red-600' : 'text-gray-300 cursor-not-allowed'
                              }`}
                            />
                            <span className={`ml-2 text-sm ${!hasOtherOwners ? 'text-gray-400' : 'text-gray-700'}`}>
                              Delete only my account but keep the studio open
                            </span>
                          </label>
                        </div>
                        
                        {!hasOtherOwners && (
                          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                            To keep the studio open but delete your account, you must first add another 
                            owner in the User Management section.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  Please type <span className="font-medium">delete my account</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Type 'delete my account'"
                />
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isSubmitting || deleteConfirmText !== 'delete my account'}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
