import { Plus, Hash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useChannels } from "../../hooks/useChannels";
import { useAuth } from "../../contexts/AuthContext";

interface ChannelListProps {
	onNewChannel: () => void; // Add prop for triggering the modal
}

export default function ChannelList({ onNewChannel }: ChannelListProps) {
	const { channels, loading } = useChannels();
	const { channelId } = useParams();
	const navigate = useNavigate();
	const { profile } = useAuth();

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

	return (
		<div className="h-full flex flex-col">
			<div className="p-4 border-b">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-semibold text-brand-primary">Class Channels</h2>
					{profile?.role === "owner" && (
						<button
							onClick={onNewChannel} // Use the callback here
							className="p-1 text-gray-500 hover:text-brand-primary"
							title="Create Channel"
						>
							<Plus className="w-5 h-5" />
						</button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{channels.length === 0 ? (
					<div className="p-4 text-center text-gray-500">
						<p>No channels available</p>
						{profile?.role === "owner" && (
							<p className="text-sm mt-2">Create a channel to get started</p>
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
