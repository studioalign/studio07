import React, { useEffect } from "react";
import { Plus, Hash, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useChannels } from "../../hooks/useChannels";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

interface ChannelListProps {
	onNewChannel: () => void; // Add prop for triggering the modal
}

export default function ChannelList({ onNewChannel }: ChannelListProps) {
	const { channels, loading, error, refresh } = useChannels();
	const { channelId } = useParams();
	const navigate = useNavigate();
	const { profile } = useAuth();
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Add useEffect to refresh channels when channelId changes
	// This helps ensure we have updated channel names when switching channels
	useEffect(() => {
		refresh();
	}, [channelId, refresh]);

	// Add function to refresh channels manually
	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
		} catch (error) {
			console.error("Error refreshing channels:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	if (loading) {
		return (
			<div className="p-4">
				<div className="animate-pulse space-y-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-10 bg-gray-200 rounded" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4">
				<div className="text-center text-red-500">
					<p className="mb-4">Something went wrong</p>
					<p className="text-sm mb-4">{error}</p>
					<button
						onClick={handleRefresh}
						className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 flex items-center justify-center mx-auto"
						disabled={isRefreshing}
					>
						<RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
						{isRefreshing ? 'Refreshing...' : 'Retry'}
					</button>
				</div>
				{/* Remove duplicate Create Channel button from error state */}
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<div className="p-4 border-b">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-semibold text-brand-primary">Class Channels</h2>
					{/* Keep this Create Channel button in the header */}
					{profile?.role === "owner" && (
						<button
							onClick={onNewChannel}
							className="p-1 text-gray-500 hover:text-brand-primary"
							title="Create Channel"
						>
							<Plus className="w-5 h-5" />
						</button>
					)}
				</div>
				
				{/* Add manual refresh button */}
				<button
					onClick={handleRefresh}
					className="text-xs text-brand-primary hover:text-brand-secondary-400 flex items-center"
					disabled={isRefreshing}
				>
					<RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
					{isRefreshing ? 'Refreshing...' : 'Refresh channels'}
				</button>
			</div>

			<div className="flex-1 overflow-y-auto">
				{channels.length === 0 ? (
					<div className="p-4 text-center text-gray-500">
						<p>No channels available</p>
						{/* Remove duplicate Create Channel button for empty state */}
						{profile?.role === "owner" && (
							<div className="mt-4">
								<p className="text-sm mb-3">Click the plus icon above to create a channel</p>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-1 p-2">
						{channels.map((channel) => (
							<button
								key={channel.id}
								onClick={() => navigate(`/dashboard/channels/${channel.id}`)}
								className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
									channelId === channel.id
										? "bg-brand-secondary-100/10 text-brand-primary"
										: "hover:bg-gray-100 text-gray-700"
								}`}
							>
								<Hash className="w-4 h-4 mr-2 flex-shrink-0" />
								<span className="truncate">{channel.name}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
