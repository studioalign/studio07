import { SupabaseClient } from "@supabase/supabase-js";

export default async function uploadImage(
	supabase: SupabaseClient,
	photoFile: File,
	userId: string
) {
	const bytes = await photoFile.arrayBuffer();
	const bucket = supabase.storage.from("user_photos");
	const extension = photoFile.name.split(".").pop();
	const fileName = `${userId}.${extension}`;

	const result = await bucket.upload(fileName, bytes, {
		upsert: true,
	});

	if (!result.error) {
		return bucket.getPublicUrl(fileName).data.publicUrl;
	}

	throw result.error;
}
