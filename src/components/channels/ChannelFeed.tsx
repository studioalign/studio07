import React, { useState, useEffect } from "react";
import { useChannel } from "../../hooks/useChannel";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";
import ChannelMembers from "./ChannelMembers";
import { ArrowLeft } from "lucide-react";

interface ChannelFeedProps {
	channelId: string;
}

export default function ChannelFeed({ channelId }: ChannelFeedProps) {
	const { posts, channel, loading, error } = useChannel(channelId);
	const [showMembers, setShowMembers] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (channel?.members) {
			setIsAdmin(channel.members.some((m) => m.role === "admin"));
		}
	}, [channel]);

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
			{/* Mobile back button */}
			<div className="lg:hidden flex items-center px-4 py-2 border-b bg-white">
				<button
					onClick={() => window.history.back()}
					className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				<h2 className="ml-2 font-medium text-gray-900">Back to Channels</h2>
			</div>

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
		</div>
	);
}
