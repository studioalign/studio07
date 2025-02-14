import React, { useState, useEffect } from 'react';
import { X, Upload, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { getUsersByRole } from '../../utils/messagingUtils';
import FormInput from '../FormInput';

interface UploadDocumentModalProps {
  onClose: () => void;
}

interface BulkOption {
  id: string;
  label: string;
  type: 'bulk';
  role: 'teacher' | 'parent';
}

type RecipientOption = { id: string; label: string } | BulkOption;

export default function UploadDocumentModal({ onClose }: UploadDocumentModalProps) {
  const { teachers } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<RecipientOption[]>([]);
  const [availableUsers, setAvailableUsers] = useState<RecipientOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch teachers and parents
        const [teachers, parents] = await Promise.all([
          getUsersByRole('teacher'),
          getUsersByRole('parent'),
        ]);

        // Create bulk options
        const bulkOptions: BulkOption[] = [
          { id: 'all-teachers', label: 'All Teachers', type: 'bulk', role: 'teacher' },
          { id: 'all-parents', label: 'All Parents', type: 'bulk', role: 'parent' },
        ];

        // Create individual user options
        const userOptions = [
          ...teachers.map(user => ({
            id: user.id,
            label: `${user.name} (${user.email})`,
          })),
          ...parents.map(user => ({
            id: user.id,
            label: `${user.name} (${user.email})`,
          })),
        ];

        setAvailableUsers([...bulkOptions, ...userOptions]);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      }
    };

    fetchUsers();
  }, []);

  const handleUserSelection = (options: RecipientOption[]) => {
    let newSelection = options.reduce<RecipientOption[]>((acc, option) => {
      if ('type' in option && option.type === 'bulk') {
        // If selecting a bulk option, add all users of that role
        const roleUsers = availableUsers.filter(user => 
          !('type' in user) && // Only include individual users, not bulk options
          // Get users matching the selected role
          availableUsers.find(bulkOpt => 
            'type' in bulkOpt && 
            bulkOpt.type === 'bulk' && 
            bulkOpt.role === option.role && 
            bulkOpt.id === option.id
          ) &&
          !acc.some(selected => selected.id === user.id) // Avoid duplicates
        );
        return [...acc, ...roleUsers];
      }
      return [...acc, option];
    }, []);

    // Remove duplicates
    newSelection = newSelection.filter((option, index, self) =>
      index === self.findIndex(o => o.id === option.id)
    );

    setSelectedUsers(newSelection);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 z-50 flex flex-col">
        <div className="flex-none px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-brand-primary">Upload Document</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              id="name"
              type="text"
              label="Document Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-brand-secondary-400">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-secondary-400">
                Upload PDF
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md font-medium text-brand-primary hover:text-brand-secondary-400">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF up to 10MB</p>
                </div>
              </div>
              {file && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {file.name}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresSignature"
                checked={requiresSignature}
                onChange={(e) => setRequiresSignature(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
              />
              <label
                htmlFor="requiresSignature"
                className="text-sm font-medium text-gray-700"
              >
                Requires signature
              </label>
            </div>

            <FormInput
              id="expiryDate"
              type="date"
              label="Expiry Date (Optional)"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />

            <MultiSelectDropdown
              id="recipients"
              label="Select Recipients"
              value={selectedUsers}
              onChange={handleUserSelection}
              options={availableUsers}
              required
            />

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </form>
        </div>

        <div className="flex-none px-6 py-4 border-t bg-white">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !name || !file || selectedUsers.length === 0}
              className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </button>
          </div>
        </div>
      </div>
    </>
  );
}