import React, { useState } from 'react';
import { MoreHorizontal, File, Clock, Download, Send, Eye, FileCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import SendReminderModal from './SendReminderModal';
import ViewRecipientsModal from './ViewRecipientsModal';
import { supabase } from '../../lib/supabase';

interface Recipient {
  id: string;
  name: string;
  email: string;
  viewed_at: string | null;
  signed_at: string | null;
  last_reminder_sent: string | null;
}

interface Document {
  id: string;
  name: string;
  description: string;
  file_url: string;
  requires_signature: boolean;
  created_at: string;
  expires_at: string | null;
  status: 'active' | 'archived';
  recipients: Recipient[];
}

export default function OwnerDocumentTable({ documents }: { documents: Document[] }) {
  const [showActions, setShowActions] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleToggleActions = (documentId: string) => {
    setShowActions(showActions === documentId ? null : documentId);
  };

  const isDocumentExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleSendReminder = (document: Document) => {
    setSelectedDocument(document);
    setShowReminderModal(true);
    setShowActions(null);
  };

  const handleViewRecipients = (document: Document) => {
    setSelectedDocument(document);
    setShowRecipientsModal(true);
    setShowActions(null);
  };

  const handleArchiveDocument = async (documentId: string) => {
    try {
      await supabase
        .from('documents')
        .update({ status: 'archived' })
        .eq('id', documentId);
      
      // Reload the page to refresh the document list
      window.location.reload();
    } catch (err) {
      console.error('Error archiving document:', err);
    }
  };

  // Function to determine if a document is fully signed
  const isDocumentSigned = (doc: Document) => {
    return doc.requires_signature && 
           doc.recipients.length > 0 && 
           doc.recipients.every(r => !!r.signed_at);
  };

  // Function to get status display text
  const getStatusText = (doc: Document) => {
    if (!doc.requires_signature) {
      return "No Signature Required";
    }
    
    if (isDocumentSigned(doc)) {
      return "Signed";
    }
    
    return "Requires Signature";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date Created
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recipients
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expiry
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((document) => (
            <tr key={document.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {isDocumentSigned(document) ? (
                      <FileCheck className="w-5 h-5 text-green-500" />
                    ) : (
                      <File className="w-5 h-5 text-brand-primary" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{document.name}</div>
                    <div className="text-sm text-gray-500">{document.description}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {format(new Date(document.created_at), 'PPP')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  isDocumentSigned(document)
                    ? 'bg-green-100 text-green-800'
                    : document.requires_signature
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusText(document)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button 
                  onClick={() => handleViewRecipients(document)}
                  className="text-brand-primary hover:text-brand-secondary-400"
                >
                  {document.recipients.length} recipient{document.recipients.length !== 1 ? 's' : ''}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {document.expires_at ? (
                  <span className={`text-sm ${
                    isDocumentExpired(document.expires_at) ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {format(new Date(document.expires_at), 'PPP')}
                    {isDocumentExpired(document.expires_at) && ' (Expired)'}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">No expiry</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                <button
                  onClick={() => handleToggleActions(document.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showActions === document.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleDownload(document.file_url, document.name)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                      <button
                        onClick={() => handleViewRecipients(document)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Recipients
                      </button>
                      {document.requires_signature && (
                        <button
                          onClick={() => handleSendReminder(document)}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Reminder
                        </button>
                      )}
                      <button
                        onClick={() => handleArchiveDocument(document.id)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Archive
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showReminderModal && selectedDocument && (
        <SendReminderModal
          document={selectedDocument}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {showRecipientsModal && selectedDocument && (
        <ViewRecipientsModal
          document={selectedDocument}
          onClose={() => setShowRecipientsModal(false)}
        />
      )}
    </div>
  );
}
