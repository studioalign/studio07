import { SupabaseClient } from "@supabase/supabase-js";

export default async function uploadImage(
	supabase: SupabaseClient,
	photoFile: File,
	userId: string
) {
	const bytes = await photoFile.arrayBuffer();
	console.log("bytes", bytes);
	const bucket = supabase.storage.from("user_photos");
	console.log("bucket", bucket);
	const extension = photoFile.name.split(".").pop();
	console.log("extension", extension);
	const fileName = `${userId}.${extension}`;
	console.log("fileName", fileName);

	const result = await bucket.upload(fileName, bytes, {
		upsert: true,
	});

	console.log("result", result);

	if (!result.error) {
		return bucket.getPublicUrl(fileName).data.publicUrl;
	}

	throw result.error;
}
