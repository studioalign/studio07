import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import FormInput from '../FormInput';

interface AddTeacherFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddTeacherForm({ onSuccess, onCancel }: AddTeacherFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Mock success - in real implementation, this would:
      // 1. Create a pending teacher record
      // 2. Send an invitation email
      // 3. Create the teacher record when they accept
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <FormInput
          id="phone"
          type="tel"
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Professional Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Professional Information</h3>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            placeholder="Share the teacher's background, experience, and teaching philosophy..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400 mb-1">
            Dance Specialties
          </label>
          <textarea
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            placeholder="e.g., Ballet, Contemporary, Jazz, Hip Hop..."
          />
        </div>
      </div>

      {/* Email Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-brand-primary">Invitation Preview</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            An invitation email will be sent to <span className="font-medium">{email || '[email address]'}</span> with:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li>• A personalized welcome message</li>
            <li>• Instructions to create their account</li>
            <li>• Information about accessing the studio platform</li>
            <li>• Next steps to complete their profile</li>
          </ul>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !email.trim()}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}