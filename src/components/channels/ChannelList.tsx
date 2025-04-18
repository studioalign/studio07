import React, { Plus, Hash, useNavigate, useParams, useRef, useCallback, useState, useEffect } from "react";
import { useChannels } from "../../hooks/useChannels";
import { useAuth } from "../../contexts/AuthContext";

interface ChannelListProps {
	onNewChannel: () => void;
}

export default function ChannelList({ onNewChannel }: ChannelListProps) {
	const { channels, loading, error, refresh } = useChannels();
	const { channelId } = useParams();
	const navigate = useNavigate();
	const { profile } = useAuth();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const listRef = useRef(null); // Add a ref

	const forceUpdate = useCallback(() => {
		if (listRef.current && typeof listRef.current.forceUpdate === 'function') {
			listRef.current.forceUpdate();
		}
	}, []);

	// This effect will ensure the channel list updates when changes occur or when channelId changes
	useEffect(() => {
		refresh();
	}, [channelId, refresh]);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
			forceUpdate(); // Try forcing an update after refresh
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
						{isRefreshing ? 'Refreshing...' : 'Retry'}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div ref={listRef} className="h-full flex flex-col">
			<div className="p-4 border-b">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-semibold text-brand-primary">Class Channels</h2>
					<div className="flex items-center space-x-1">
						<button
							onClick={handleRefresh}
							className="p-1 text-gray-500 hover:text-brand-primary"
							title="Refresh Channels"
							disabled={isRefreshing}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className={`${isRefreshing ? 'animate-spin' : ''}`}
							>
								<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
								<path d="M3 3v5h5"></path>
							</svg>
						</button>
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
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{channels.length === 0 ? (
					<div className="p-4 text-center text-gray-500">
						<p>No channels available</p>
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
