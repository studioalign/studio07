import React, { useState, useEffect } from "react";
import {
	File,
	FileCheck,
	Clock,
	AlertCircle,
	Search,
	Plus,
	Send,
	Eye,
	PenSquare,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import UploadDocumentModal from "./UploadDocumentModal";
import ViewDocumentModal from "./ViewDocumentModal";
import OwnerDocumentTable from "./OwnerDocumentTable";
import UserDocumentTable from "./UserDocumentTable";
import { supabase } from "../../lib/supabase";

interface Document {
	id: string;
	name: string;
	description: string;
	file_url: string;
	requires_signature: boolean;
	created_at: string;
	expires_at: string | null;
	status: "active" | "archived";
	viewed_at: string | null;
	signed_at: string | null;
	recipient_id?: string; // Added to track user's recipient record ID
}

export default function DocumentList() {
	const { profile } = useAuth();
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [selectedDocument, setSelectedDocument] = useState<Document | null>(
		null
	);
	const [filter, setFilter] = useState<"all" | "pending" | "signed">("all");
	const [search, setSearch] = useState("");

	// Define the document state variables
	const [ownerDocuments, setOwnerDocuments] = useState<any[]>([]);
	const [userDocuments, setUserDocuments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load documents when component mounts
	useEffect(() => {
		if (profile) {
			loadDocuments();
		}
	}, [profile]);

	// Set up real-time subscriptions for document updates
	useEffect(() => {
		if (!profile?.id) return;

		// Create the subscription for document_recipients changes
		const subscription = supabase
			.channel("document-status-changes")
			.on(
				"postgres_changes",
				{
					event: "*", // Listen for all events (UPDATE, INSERT, DELETE)
					schema: "public",
					table: "document_recipients",
					filter:
						profile.role === "owner"
							? undefined // Subscribe to all updates for owners
							: `user_id=eq.${profile.id}`, // Only user's own updates for non-owners
				},
				(payload) => {
					// Refresh documents when a document status changes
					loadDocuments();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(subscription);
		};
	}, [profile?.id, profile?.role]);

	// Load the appropriate documents based on user role
	const loadDocuments = async () => {
		setLoading(true);
		setError(null);

		try {
			if (profile?.role === "owner") {
				const documents = await fetchOwnerDocuments();
				setOwnerDocuments(documents);
			} else {
				const documents = await fetchUserDocuments();
				setUserDocuments(documents);
			}
		} catch (err) {
			console.error("Error loading documents:", err);
			setError("Failed to load documents. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	// For owner
	const fetchOwnerDocuments = async () => {
		try {
			const { data, error } = await supabase
				.from("documents")
				.select(
					`
          *,
          recipients:document_recipients(
            id,
            user_id,
            viewed_at,
            signed_at,
            last_reminder_sent,
            user:users(id, name, email)
          )
        `
				)
				.eq("studio_id", profile?.studio?.id)
				.order("created_at", { ascending: false });

			if (error) throw error;

			// Transform data to match component expectations
			const transformedData = data.map((doc) => ({
				...doc,
				recipients: doc.recipients.map((r) => ({
					id: r.id,
					name: r.user?.name || "Unknown",
					email: r.user?.email || "",
					viewed_at: r.viewed_at,
					signed_at: r.signed_at,
					last_reminder_sent: r.last_reminder_sent,
				})),
			}));

			return transformedData;
		} catch (err) {
			console.error("Error fetching documents:", err);
			return [];
		}
	};

	// For users (teachers/parents)
	const fetchUserDocuments = async () => {
		try {
			const { data, error } = await supabase
				.from("document_recipients")
				.select(
					`
          id,
          viewed_at,
          signed_at,
          document:documents(*)
        `
				)
				.eq("user_id", profile?.id);

			if (error) throw error;

			// Transform data to match component expectations
			// Ensure signed_at from document_recipients takes precedence
			const transformedData = data.map((item) => ({
				id: item.document?.id || "",
				name: item.document?.name || "Unknown Document",
				description: item.document?.description || "",
				file_url: item.document?.file_url || "",
				requires_signature: item.document?.requires_signature || false,
				created_at: item.document?.created_at || new Date().toISOString(),
				expires_at: item.document?.expires_at || null,
				status: item.document?.status || "active",
				viewed_at: item.viewed_at,
				signed_at: item.signed_at, // Use the recipient's signed_at status
				recipient_id: item.id, // Store the recipient record ID for updates
			}));

			return transformedData;
		} catch (err) {
			console.error("Error fetching documents:", err);
			return [];
		}
	};

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

	// Fixed filter logic for owner documents
	const filteredDocuments = ownerDocuments.filter((doc) => {
		if (filter === "pending") {
			// Only include documents that require signature and have at least one unsigned recipient
			return (
				doc.requires_signature &&
				doc.recipients.some((r) => !r.signed_at) &&
				doc.status === "active"
			);
		}
		if (filter === "signed") {
			// Only include documents that require signature and all recipients have signed
			return (
				doc.requires_signature &&
				doc.recipients.length > 0 &&
				doc.recipients.every((r) => !!r.signed_at)
			);
		}
		return true; // Show all documents for 'all' filter
	});

	// Filter logic for user documents
	const filteredUserDocuments = userDocuments.filter((doc) => {
		if (filter === "pending") {
			return (
				doc.requires_signature && !doc.signed_at && doc.status === "active"
			);
		}
		if (filter === "signed") {
			return doc.signed_at !== null;
		}
		return true;
	});

	const searchFilter = (doc: Document) =>
		doc.name.toLowerCase().includes(search.toLowerCase()) ||
		doc.description.toLowerCase().includes(search.toLowerCase());

	const finalOwnerDocuments = filteredDocuments.filter(searchFilter);
	const finalUserDocuments = filteredUserDocuments.filter(searchFilter);

	const handleDocumentUpdated = () => {
		// Refresh documents when a document is updated or signed
		loadDocuments();
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">
					{profile?.role === "owner" ? "Document Management" : "My Documents"}
				</h1>
				{profile?.role === "owner" && (
					<button
						onClick={() => setShowUploadModal(true)}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						<Plus className="w-5 h-5 mr-2" />
						Upload Document
					</button>
				)}
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
					{error}
				</div>
			)}

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
								onClick={() => setFilter("all")}
								className={`px-4 py-2 rounded-md ${
									filter === "all"
										? "bg-brand-primary text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								All
							</button>
							<button
								onClick={() => setFilter("pending")}
								className={`px-4 py-2 rounded-md ${
									filter === "pending"
										? "bg-brand-primary text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Pending
							</button>
							<button
								onClick={() => setFilter("signed")}
								className={`px-4 py-2 rounded-md ${
									filter === "signed"
										? "bg-brand-primary text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200"
								}`}
							>
								Signed
							</button>
						</div>
					</div>
				</div>

				{(profile?.role === "owner" ? finalOwnerDocuments : finalUserDocuments)
					.length === 0 ? (
					<div className="py-8 text-center text-gray-500">
						<File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
						<p>No documents found</p>
						{profile?.role === "owner" && (
							<button
								onClick={() => setShowUploadModal(true)}
								className="mt-4 text-brand-primary hover:underline"
							>
								Upload your first document
							</button>
						)}
					</div>
				) : profile?.role === "owner" ? (
					<OwnerDocumentTable documents={finalOwnerDocuments} />
				) : (
					<UserDocumentTable documents={finalUserDocuments} />
				)}
			</div>

			{showUploadModal && (
				<UploadDocumentModal
					onClose={() => setShowUploadModal(false)}
					onSuccess={handleDocumentUpdated}
				/>
			)}

			{selectedDocument && (
				<ViewDocumentModal
					document={selectedDocument}
					onClose={() => {
						setSelectedDocument(null);
						handleDocumentUpdated();
					}}
				/>
			)}
		</div>
	);
}
