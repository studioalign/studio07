import React, { useState } from 'react';
import { Eye, PenSquare, Send, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  created_at: string;
  requires_signature: boolean;
  expires_at: string | null;
  recipients?: Recipient[];
}

interface OwnerDocumentTableProps {
  documents: Document[];
}

export default function OwnerDocumentTable({ documents }: OwnerDocumentTableProps) {
  const [expandedDocument, setExpandedDocument] = useState<string | null>(null);

  const sendReminder = async (documentId: string, recipientId: string) => {
    try {
      // Fetch recipient and document details
      const { data: recipientData, error } = await supabase
        .from('document_recipients')
        .select(`
          user:users(id, name, email),
          document:documents(id, name, requires_signature, studio_id)
        `)
        .eq('id', recipientId)
        .single();
  
      if (error) throw error;
  
      const { user, document } = recipientData;
  
      // Send in-app and email reminder
      await notificationService.createNotification({
        user_id: user.id,
        studio_id: document.studio_id,
        type: 'document_reminder',
        title: 'Document Reminder',
        message: `Reminder: Please ${document.requires_signature ? 'sign' : 'view'} the document "${document.name}"`,
        priority: 'high',
        entity_id: document.id,
        entity_type: 'document',
        requires_action: true,
        email_required: true
      });
  
      // Update last reminder sent timestamp
      await supabase
        .from('document_recipients')
        .update({ last_reminder_sent: new Date().toISOString() })
        .eq('id', recipientId);
  
      alert('Reminder sent successfully');
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert('Failed to send reminder');
    }
  };

  const getStatusIcon = (recipient: Recipient) => {
    if (recipient.signed_at) {
      return <PenSquare className="w-4 h-4 text-green-500" />;
    }
    if (recipient.viewed_at) {
      return <Eye className="w-4 h-4 text-yellow-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (recipient: Recipient) => {
    if (recipient.signed_at) {
      return `Signed ${formatDistanceToNow(new Date(recipient.signed_at), { addSuffix: true })}`;
    }
    if (recipient.viewed_at) {
      return `Viewed ${formatDistanceToNow(new Date(recipient.viewed_at), { addSuffix: true })}`;
    }
    return 'Not viewed';
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No documents found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recipients
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => (
            <React.Fragment key={doc.id}>
              <tr 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedDocument(expandedDocument === doc.id ? null : doc.id)}
              >
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{doc.name}</span>
                    <span className="text-sm text-gray-500">{doc.description}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full justify-center w-full
                      ${doc.requires_signature ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                    >
                      {doc.requires_signature ? 'Signature Required' : 'View Only'}
                    </span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                  {doc.recipients?.length || 0} recipients
                </td>
              </tr>
              {expandedDocument === doc.id && doc.recipients && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 bg-gray-50">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Recipient
                            </th>
                            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Reminder
                            </th>
                            <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {doc.recipients.map((recipient) => (
                            <tr key={recipient.id}>
                              <td className="px-3 sm:px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">{recipient.name}</span>
                                  <span className="text-sm text-gray-500">{recipient.email}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(recipient)}
                                  <span className="text-sm text-gray-500">
                                    {getStatusText(recipient)}
                                  </span>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                                {recipient.last_reminder_sent
                                  ? formatDistanceToNow(new Date(recipient.last_reminder_sent), { addSuffix: true })
                                  : 'Never'}
                              </td>
                              <td className="px-3 sm:px-6 py-4 text-right">
                                {!recipient.signed_at && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendReminder(doc.id, recipient.id);
                                    }}
                                    className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm leading-5 font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
                                  >
                                    <Send className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Send Reminder</span>
                                    <span className="sm:hidden">Send</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}