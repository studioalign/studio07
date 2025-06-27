import React, { useState, useRef } from "react";
import { Send, Trash2, Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createComment } from "../../utils/channelUtils";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface Comment {
	id: string;
	content: string;
	created_at: string;
	edited_at: string | null;
	author: {
		id: string;
		name: string;
	};
}

interface CommentSectionProps {
	postId: string;
	channelId: string;
	comments: Comment[];
}

export default function CommentSection({
	postId,
	channelId,
	comments,
}: CommentSectionProps) {
	const { profile } = useAuth();
	const [newComment, setNewComment] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
	const [editedContent, setEditedContent] = useState("");
	const commentEndRef = useRef<HTMLDivElement>(null);

	// Scroll to the latest comment when comments change
	React.useEffect(() => {
		if (comments.length > 0) {
			commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [comments.length]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComment.trim()) return;

		setIsSubmitting(true);
		setError(null);

		try {
			// Explicit authentication check
			if (!profile?.id) {
				throw new Error("User not authenticated");
			}

			await createComment(postId, newComment.trim());
			setNewComment("");
		} catch (err) {
			console.error("Full error in handleSubmit:", {
				errorType: typeof err,
				errorConstructor: err?.constructor?.name,
				errorObject: err,
				errorMessage: err instanceof Error ? err.message : "Unknown error",
				errorStack: err instanceof Error ? err.stack : "No stack trace",
			});

			// Set a meaningful error message
			const errorMessage =
				err instanceof Error
					? err.message
					: "An unexpected error occurred while posting the comment";

			setError(errorMessage);
			console.error("User-facing error:", errorMessage);
		} finally {
			console.groupEnd();
			setIsSubmitting(false);
		}
	};

	const handleEditComment = async (commentId: string, newContent: string) => {
		if (!newContent.trim() || !commentId) return;

		try {
			const { error } = await supabase
				.from("post_comments")
				.update({
					content: newContent.trim(),
					edited_at: new Date().toISOString(),
				})
				.eq("id", commentId);

			if (error) throw error;
			setEditingCommentId(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update comment");
		}
	};

	const handleDeleteComment = async (commentId: string) => {
		if (!window.confirm("Are you sure you want to delete this comment?"))
			return;

		try {
			const { error } = await supabase
				.from("post_comments")
				.delete()
				.eq("id", commentId);

			if (error) throw error;
			// The comment will be removed via the real-time subscription
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete comment");
		}
	};

	const canModifyComment = (authorId: string) => {
		return profile?.id === authorId || profile?.role === "owner";
	};

	return (
		<div className="border-t bg-gray-50 p-4">
			{error && (
				<div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
					{error}
				</div>
			)}

			<div className="space-y-4 max-h-80 overflow-y-auto">
				{comments.length === 0 ? (
					<p className="text-center text-gray-500 py-4 text-sm">
						No comments yet. Be the first to comment!
					</p>
				) : (
					comments.map((comment) => (
						<div key={comment.id} className="flex space-x-3">
							<div className="w-8 h-8 rounded-full bg-brand-secondary-100 flex items-center justify-center flex-shrink-0">
								<span className="text-brand-primary text-sm font-medium">
									{comment.author?.name?.[0] || "?"}
								</span>
							</div>
							<div className="flex-1">
								{editingCommentId === comment.id ? (
									<div className="space-y-2">
										<textarea
											value={editedContent}
											onChange={(e) => setEditedContent(e.target.value)}
											className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
											rows={2}
										/>
										<div className="flex justify-end space-x-2">
											<button
												onClick={() => setEditingCommentId(null)}
												className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
											>
												Cancel
											</button>
											<button
												onClick={() =>
													handleEditComment(comment.id, editedContent)
												}
												className="px-2 py-1 bg-brand-primary text-white rounded-md text-xs hover:bg-brand-secondary-400"
											>
												Save
											</button>
										</div>
									</div>
								) : (
									<div className="bg-white rounded-lg p-3 shadow-sm">
										<div className="flex items-center justify-between">
											<span className="font-medium text-gray-900 text-sm">
												{comment.author?.name || "Unknown"}
											</span>
											<div className="flex items-center">
												<span className="text-xs text-gray-500">
													{formatDistanceToNow(new Date(comment.created_at), {
														addSuffix: true,
													})}
													{comment.edited_at && (
														<span className="ml-1 text-gray-400">(edited)</span>
													)}
												</span>

												{canModifyComment(comment.author?.id) && (
													<div className="ml-2 flex space-x-1">
														<button
															onClick={() => {
																setEditingCommentId(comment.id);
																setEditedContent(comment.content);
															}}
															className="p-1 text-gray-400 hover:text-brand-primary rounded-full"
															title="Edit comment"
														>
															<Edit2 className="w-3 h-3" />
														</button>
														<button
															onClick={() => handleDeleteComment(comment.id)}
															className="p-1 text-gray-400 hover:text-red-500 rounded-full"
															title="Delete comment"
														>
															<Trash2 className="w-3 h-3" />
														</button>
													</div>
												)}
											</div>
										</div>
										<p className="text-gray-700 mt-1 text-sm whitespace-pre-wrap">
											{comment.content}
										</p>
									</div>
								)}
							</div>
						</div>
					))
				)}
				<div ref={commentEndRef} />
			</div>

			<form onSubmit={handleSubmit} className="mt-4">
				<div className="flex space-x-2">
					<input
						type="text"
						value={newComment}
						onChange={(e) => setNewComment(e.target.value)}
						placeholder="Write a comment..."
						className={`flex-1 px-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent ${
							error ? "border-red-500" : ""
						}`}
					/>
					<button
						type="submit"
						disabled={isSubmitting || !newComment.trim()}
						className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
					>
						{isSubmitting ? (
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
						) : (
							<Send className="w-5 h-5" />
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
