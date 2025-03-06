import React, { useState, useEffect } from "react";
import { useChannel } from "../../hooks/useChannel";
import { useAuth } from "../../contexts/AuthContext"; // Add this import
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";
import ChannelMembers from "./ChannelMembers";
import ChannelHeader from "./ChannelHeader";
import ChannelSettingsModal from "./ChannelSettingsModal";
import MediaGalleryModal from "./MediaGalleryModal";
import { ArrowLeft } from "lucide-react";

interface ChannelFeedProps {
	channelId: string;
}

export default function ChannelFeed({ channelId }: ChannelFeedProps) {
	const { profile } = useAuth(); // Add this line
	const { 
		channel, 
		posts, 
		loading, 
		error, 
		fetchChannelData 
	} = useChannel(channelId);
	const [showMembers, setShowMembers] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [showMediaGallery, setShowMediaGallery] = useState(false);

	useEffect(() => {
		if (channel?.members && profile) {
			setIsAdmin(channel.members.some((m) => m.user_id === profile.id && m.role === "admin"));
		}
	}, [channel, profile]); // Add profile to the dependency array

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await fetchChannelData();
		} catch (err) {
			console.error('Error refreshing channel:', err);
		} finally {
			setIsRefreshing(false);
		}
	};

	if (loading) {
		return (
			<div className="p-6">
				<div className="animate-pulse space-y-6">
					<div className="h-20 bg-gray-200 rounded-lg" />
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-40 bg-gray-200 rounded-lg" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 text-center text-red-500">
				<p>Error: {error}</p>
			</div>
		);
	}

	if (!channel) {
		return (
			<div className="p-6 text-center text-gray-500">
				<p>Channel not found</p>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<ChannelHeader 
				channel={channel}
				isAdmin={isAdmin}
				onShowMembers={() => setShowMembers(true)}
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing}
				onShowSettings={() => setShowSettings(true)}
				onShowMediaGallery={() => setShowMediaGallery(true)}
			/>

			<div className="flex-1 overflow-y-auto p-6 space-y-6">
				{posts.map((post) => (
					<PostCard
						key={post.id}
						post={post}
						isAdmin={isAdmin}
						channelId={channelId}
					/>
				))}
				{posts.length === 0 && (
					<div className="text-center text-gray-500">
						<p>No posts yet</p>
						<p className="text-sm">Be the first to post in this channel!</p>
					</div>
				)}
			</div>

			<div className="border-t bg-white p-4">
				<PostComposer channelId={channelId} />
			</div>

			{showMembers && (
				<ChannelMembers
					channelId={channelId}
					onClose={() => setShowMembers(false)}
				/>
			)}

			{showSettings && channel && (
				<ChannelSettingsModal
					channel={channel}
					onClose={() => setShowSettings(false)}
					onChannelUpdated={handleRefresh}
				/>
			)}
			{showMediaGallery && (
        		<MediaGalleryModal
         			channelId={channelId}
          			onClose={() => setShowMediaGallery(false)}
        		/>
      		)}
		</div>
	);
}