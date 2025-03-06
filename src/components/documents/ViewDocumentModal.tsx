import React, { useState, useEffect } from 'react';
import { X, Download, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DocumentData {
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
  document: DocumentData;
  onClose: () => void;
}

export default function ViewDocumentModal({ document, onClose }: ViewDocumentModalProps) {
  const { profile } = useAuth();
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mark document as viewed when opened
  useEffect(() => {
    const markAsViewed = async () => {
      if (!document.viewed_at && profile?.id) {
        try {
          const { error } = await supabase
            .from('document_recipients')
            .update({ viewed_at: new Date().toISOString() })
            .eq('document_id', document.id)
            .eq('user_id', profile.id);
          
          if (error) {
            console.error('Error marking document as viewed:', error);
          }
        } catch (err) {
          console.error('Failed to mark document as viewed:', err);
        }
      }
    };

    markAsViewed();
  }, [document.id, document.viewed_at, profile?.id]);

  // Handle downloading the document
  const handleDownload = () => {
    if (document.file_url) {
      // Create a link and simulate a click to download the file
      const link = document.createElement('a');
      link.href = document.file_url;
      link.download = `${document.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) {
      setError('Please enter your signature');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update the document_recipients record to mark as signed
      if (profile?.id) {
        const { error } = await supabase
          .from('document_recipients')
          .update({
            signed_at: new Date().toISOString(),
            signature: signature,
            viewed_at: new Date().toISOString() // Ensure viewed_at is also set
          })
          .eq('document_id', document.id)
          .eq('user_id', profile.id);

        if (error) throw error;
        
        // Show success message
        setSuccess(true);
        
        // Close after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('User not authenticated');
      }
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
              onClick={handleDownload}
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
          {/* PDF Viewer using iframe */}
          <div className="flex-1 bg-gray-100 p-4">
            {document.file_url ? (
              <iframe
                src={`${document.file_url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                className="w-full h-full rounded-lg shadow"
                title={document.name}
              ></iframe>
            ) : (
              <div className="w-full h-full bg-white rounded-lg shadow flex items-center justify-center">
                <p className="text-gray-500">Document not available</p>
              </div>
            )}
          </div>

          {/* Signature Panel */}
          {document.requires_signature && !document.signed_at && !success && (
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
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? 'Signing...' : 'Sign Document'}
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  By signing this document, you acknowledge that you have read and agree to its contents.
                  Your typed name will serve as your electronic signature.
                </p>
              </form>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="w-80 border-l bg-white p-4 overflow-y-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-green-800">Document Signed</h3>
                <p className="text-sm text-green-600 mt-2">
                  The document has been successfully signed.
                </p>
              </div>
            </div>
          )}

          {/* If already signed, show signed confirmation */}
          {document.requires_signature && document.signed_at && !success && (
            <div className="w-80 border-l bg-white p-4 overflow-y-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-green-800">Document Signed</h3>
                <p className="text-sm text-green-600 mt-2">
                  You signed this document on{' '}
                  {new Date(document.signed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}