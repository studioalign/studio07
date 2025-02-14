import { supabase } from '../lib/supabase';

export async function createPost(channelId: string, content: string, files: File[]) {
  try {
    // First create the post
    const { data: post, error: postError } = await supabase
      .from('channel_posts')
      .insert([
        {
          channel_id: channelId,
          content,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select()
      .single();

    if (postError) throw postError;

    // If there are files, upload them and create media records
    if (files.length > 0) {
      const mediaPromises = files.map(async (file) => {
        // Upload file to storage
        const fileExt = file.name.split('.').pop();
        const filePath = `channel-media/${post.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('channel-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('channel-media')
          .getPublicUrl(filePath);

        // Create media record
        const { error: mediaError } = await supabase
          .from('post_media')
          .insert([
            {
              post_id: post.id,
              url: publicUrl,
              type: file.type.startsWith('image/') ? 'image' : 'file',
              filename: file.name,
              size_bytes: file.size,
            },
          ]);

        if (mediaError) throw mediaError;
      });

      await Promise.all(mediaPromises);
    }

    return post;
  } catch (err) {
    console.error('Error creating post:', err);
    throw err;
  }
}

export async function deletePost(postId: string) {
  try {
    // Delete post (this will cascade delete media, reactions, and comments)
    const { error } = await supabase
      .from('channel_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting post:', err);
    throw err;
  }
}

export async function updatePost(postId: string, content: string) {
  try {
    const { error } = await supabase
      .from('channel_posts')
      .update({
        content,
        edited_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) throw error;
  } catch (err) {
    console.error('Error updating post:', err);
    throw err;
  }
}

export async function toggleReaction(postId: string) {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('post_reactions')
      .select()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      // Add reaction
      const { error } = await supabase
        .from('post_reactions')
        .insert([
          {
            post_id: postId,
            user_id: userId,
          },
        ]);

      if (error) throw error;
    }
  } catch (err) {
    console.error('Error toggling reaction:', err);
    throw err;
  }
}

export async function createComment(postId: string, content: string) {
  try {
    const { error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

    if (error) throw error;
  } catch (err) {
    console.error('Error creating comment:', err);
    throw err;
  }
}