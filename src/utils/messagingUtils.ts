import { supabase } from "../lib/supabase";

export async function getStudioUsersByRole(
	role: "owner" | "teacher" | "parent",
	studioId: string
) {
	try {
		const { data, error } = await supabase
			.from("users")
			.select(
				`id, name, role, email,
        studio:studios!users_studio_id_fkey(
          id, name, address, phone, email
        )
      `
			)
			.eq("role", role)
			.eq("studio_id", studioId);

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error(`Error fetching ${role}s:`, err);
		return [];
	}
}

export async function getConversationParticipants(conversationId: string) {
	try {
		const { data, error } = await supabase
			.from("conversation_participants")
			.select(
				`
        user_id,
        users:auth.users (
          email
        ),
        owner:owners (
          id,
          name
        ),
        teacher:teachers (
          id,
          name
        ),
        parent:parents (
          id,
          name
        )
      `
			)
			.eq("conversation_id", conversationId);

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error("Error fetching conversation participants:", err);
		return [];
	}
}

export function formatMessageDate(date: string) {
	const messageDate = new Date(date);
	const now = new Date();
	const diffInDays = Math.floor(
		(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24)
	);

	if (diffInDays === 0) {
		return messageDate.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	} else if (diffInDays === 1) {
		return "Yesterday";
	} else if (diffInDays < 7) {
		return messageDate.toLocaleDateString([], { weekday: "long" });
	} else {
		return messageDate.toLocaleDateString();
	}
}
