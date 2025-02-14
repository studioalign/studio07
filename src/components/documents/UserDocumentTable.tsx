import React, { useState } from 'react';
import { Eye, FileCheck, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ViewDocumentModal from './ViewDocumentModal';

interface Document {
  id: string;
  name: string;
  description: string;
  created_at: string;
  requires_signature: boolean;
  expires_at: string | null;
  status: 'active' | 'archived';
  viewed_at: string | null;
  signed_at: string | null;
}

interface UserDocumentTableProps {
  documents: Document[];
}

export default function UserDocumentTable({ documents }: UserDocumentTableProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const getStatusIcon = (doc: Document) => {
    if (doc.signed_at) {
      return <FileCheck className="w-5 h-5 text-green-500" />;
    }
    if (doc.viewed_at) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
    if (doc.expires_at && new Date(doc.expires_at) < new Date()) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Eye className="w-5 h-5 text-brand-primary" />;
  };

  const getStatusText = (doc: Document) => {
    if (doc.signed_at) {
      return `Signed ${formatDistanceToNow(new Date(doc.signed_at), { addSuffix: true })}`;
    }
    if (doc.viewed_at) {
      return `Viewed ${formatDistanceToNow(new Date(doc.viewed_at), { addSuffix: true })}`;
    }
    return 'Not viewed';
  };

  const handleDocumentAction = (doc: Document) => {
    setSelectedDocument(doc);
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
            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              Document
            </th>
            <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Received
            </th>
            <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleDocumentAction(doc)}>
              <td className="px-3 sm:px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{doc.name}</span>
                  <span className="text-sm text-gray-500">{doc.description}</span>
                </div>
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
              </td>
              <td className="hidden sm:table-cell px-3 sm:px-6 py-4">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full justify-center w-full
                  ${doc.requires_signature ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                >
                  {doc.requires_signature ? 'Signature Required' : 'View Only'}
                </span>
              </td>
              <td className="px-3 sm:px-6 py-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(doc)}
                  <span className="text-sm text-gray-500">
                    {getStatusText(doc)}
                  </span>
                </div>
              </td>
              <td className="px-3 sm:px-6 py-4">
                {!doc.signed_at && doc.requires_signature && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentAction(doc);
                    }}
                    className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm leading-5 font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
                  >
                    <span className="hidden sm:inline">Sign Document</span>
                    <span className="sm:hidden">Sign</span>
                  </button>
                )}
                {!doc.signed_at && !doc.requires_signature && !doc.viewed_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentAction(doc);
                    }}
                    className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs sm:text-sm leading-5 font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
                  >
                    <span className="hidden sm:inline">View Document</span>
                    <span className="sm:hidden">View</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedDocument && (
        <ViewDocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}