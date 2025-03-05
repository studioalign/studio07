import React, { useState } from 'react';
import { X, Download, Send } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  description: string;
  file_url: string;
  requires_signature: boolean;
  created_at: string;
  expires_at: string | null;
  status: 'active' | 'archived';
  viewed_at: string | null;
  signed_at: string | null;
}

interface ViewDocumentModalProps {
  document: Document;
  onClose: () => void;
}

export default function ViewDocumentModal({ document, onClose }: ViewDocumentModalProps) {
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) {
      setError('Please enter your signature');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex-none px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-brand-primary">{document.name}</h2>
            <p className="text-sm text-brand-secondary-400">{document.description}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {/* Handle download */}}
              className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
              title="Download document"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 p-4">
            <div className="w-full h-full bg-white rounded-lg shadow flex items-center justify-center">
              <p className="text-gray-500">PDF Viewer would be embedded here</p>
            </div>
          </div>

          {/* Signature Panel */}
          {document.requires_signature && !document.signed_at && (
            <div className="w-80 border-l bg-white p-4 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-4">Sign Document</h3>
              <form onSubmit={handleSign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-secondary-400">
                    Type your full name to sign
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
                    placeholder="Your full name"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !signature.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Sign Document
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  By signing this document, you acknowledge that you have read and agree to its contents.
                  Your typed name will serve as your electronic signature.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}