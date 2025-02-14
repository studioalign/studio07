import React, { useState } from 'react';
import { File, FileCheck, Clock, AlertCircle, Search, Plus, Send, Eye, PenSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UploadDocumentModal from './UploadDocumentModal';
import ViewDocumentModal from './ViewDocumentModal';
import OwnerDocumentTable from './OwnerDocumentTable';
import UserDocumentTable from './UserDocumentTable';

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

export default function DocumentList() {
  const { profile } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed'>('all');
  const [search, setSearch] = useState('');

  // Mock data for owners - replace with actual data fetching
  const ownerDocuments = [
    {
      id: '1',
      name: 'Studio Policy Document',
      description: 'Annual studio policies and guidelines',
      file_url: '#',
      requires_signature: true,
      created_at: '2024-02-14T12:00:00Z',
      expires_at: '2025-02-14T12:00:00Z',
      status: 'active',
      viewed_at: null,
      signed_at: null,
      recipients: [{ id: '1', name: 'John Doe', email: 'john@example.com', viewed_at: null, signed_at: null, last_reminder_sent: null }],
    },
    {
      id: '2',
      name: 'Performance Agreement',
      description: 'Agreement for upcoming spring showcase',
      file_url: '#',
      requires_signature: true,
      created_at: '2024-02-10T12:00:00Z',
      expires_at: null,
      status: 'active',
      viewed_at: '2024-02-11T15:30:00Z',
      signed_at: '2024-02-11T15:35:00Z',
      recipients: [{ id: '2', name: 'Jane Smith', email: 'jane@example.com', viewed_at: '2024-02-11T15:30:00Z', signed_at: '2024-02-11T15:35:00Z', last_reminder_sent: null }],
    },
  ];

  // Mock data for teachers/parents - replace with actual data fetching
  const userDocuments = [
    {
      id: '1',
      name: 'Studio Policy Document',
      description: 'Annual studio policies and guidelines',
      file_url: '#',
      requires_signature: true,
      created_at: '2024-02-14T12:00:00Z',
      expires_at: '2025-02-14T12:00:00Z',
      status: 'active',
      viewed_at: null,
      signed_at: null,
    },
    {
      id: '2',
      name: 'Performance Agreement',
      description: 'Agreement for upcoming spring showcase',
      file_url: '#',
      requires_signature: true,
      created_at: '2024-02-10T12:00:00Z',
      expires_at: null,
      status: 'active',
      viewed_at: '2024-02-11T15:30:00Z',
      signed_at: '2024-02-11T15:35:00Z',
    },
  ];

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
    return <File className="w-5 h-5 text-brand-primary" />;
  };

  const filteredDocuments = ownerDocuments.filter(doc => {
    if (filter === 'pending') {
      return !doc.signed_at && doc.status === 'active';
    }
    if (filter === 'signed') {
      return !!doc.signed_at;
    }
    return true;
  });

  const filteredUserDocuments = userDocuments.filter(doc => {
    if (filter === 'pending') {
      return !doc.signed_at && doc.status === 'active';
    }
    if (filter === 'signed') {
      return !!doc.signed_at;
    }
    return true;
  });

  const searchFilter = (doc: Document) =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.description.toLowerCase().includes(search.toLowerCase());
    
  const finalOwnerDocuments = filteredDocuments.filter(searchFilter);
  const finalUserDocuments = filteredUserDocuments.filter(searchFilter);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">
          {profile?.role === 'owner' ? 'Document Management' : 'My Documents'}
        </h1>
        {profile?.role === 'owner' && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            <Plus className="w-5 h-5 mr-2" />
            Upload Document
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'all'
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'pending'
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('signed')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'signed'
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Signed
              </button>
            </div>
          </div>
        </div>

        {profile?.role === 'owner' ? (
          <OwnerDocumentTable documents={finalOwnerDocuments} />
        ) : (
          <UserDocumentTable documents={finalUserDocuments} />
        )}
      </div>

      {showUploadModal && (
        <UploadDocumentModal onClose={() => setShowUploadModal(false)} />
      )}

      {selectedDocument && (
        <ViewDocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}