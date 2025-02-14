import React, { useState } from 'react';
import { Save, Bell, Shield, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState({
    classUpdates: true,
    messages: true,
    billing: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - in real implementation, this would update user settings
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'delete my account') {
      setError('Please type "delete my account" to confirm');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - in real implementation, this would delete the account
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Redirect to sign in page after deletion
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Settings</h1>
      </div>

      <div className="space-y-6">
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

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
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
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-brand-primary hover:bg-gray-50 rounded-md"
            >
              Change Password
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-brand-primary hover:bg-gray-50 rounded-md"
            >
              Two-Factor Authentication
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-500">Delete Account</h3>
          </div>
          
          <div className="max-w-lg">
            <p className="text-gray-600 mb-4">
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