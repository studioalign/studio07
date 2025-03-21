import { supabase } from '../lib/supabase';

// Helper function to determine media type from file
const getMediaType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
};

export async function createPost(channelId: string, content: string, files: File[]) {
  try {
    // Get the current user explicitly
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User authentication error:', {
        error: userError,
        message: userError.message
      });
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    const user = userData.user;
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }

    console.log('Post creation details:', {
      channelId,
      content,
      userId: user.id,
      files: files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      }))
    });

    // Verify channel membership
    const { data: memberCheck, error: memberCheckError } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single();

    if (memberCheckError) {
      console.error('Channel membership check error:', {
        error: memberCheckError,
        message: memberCheckError.message
      });
      throw new Error(`Cannot verify channel membership: ${memberCheckError.message}`);
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('channel_posts')
      .insert({
        channel_id: channelId,
        content,
        author_id: user.id,
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', {
        code: postError.code,
        message: postError.message,
        details: postError.details,
        hint: postError.hint
      });
      throw postError;
    }

    // If there are files, upload them and create media records
    const uploadedMedia = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          // Upload file to storage
          // Fix the file path construction
          const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
          const filePath = `${post.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('channel-media')
            .upload(filePath, file);

          if (uploadError) {
            console.error('File upload error:', {
              code: uploadError.code,
              message: uploadError.message,
              details: uploadError.details,
              hint: uploadError.hint
            });
            continue; // Skip to next file instead of throwing
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('channel-media')
            .getPublicUrl(filePath);

          // Determine the media type
          const mediaType = getMediaType(file);

          // Create media record
          console.log('Attempting to insert media record:', {
            post_id: post.id,
            url: publicUrl,
            type: mediaType,
            filename: file.name,
            size_bytes: file.size,
          });

          const { data: mediaData, error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: post.id,
              url: publicUrl,
              type: mediaType,
              filename: file.name,
              size_bytes: file.size,
            })
            .select()
            .single();

          if (mediaError) {
            console.error('Media insertion error:', {
              code: mediaError.code,
              message: mediaError.message,
              details: mediaError.details,
              hint: mediaError.hint
            });
            continue; // Skip to next file instead of throwing
          }

          // Add to successfully uploaded media
          if (mediaData) {
            uploadedMedia.push(mediaData);
          }
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          // Continue with next file instead of throwing
          continue;
        }
      }
    }

    // Return post with successfully uploaded media
    return {
      ...post,
      media: uploadedMedia
    };
  } catch (err) {
    console.error('Comprehensive error in createPost:', {
      errorType: typeof err,
      errorConstructor: err?.constructor?.name,
      errorObject: err,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      errorStack: err instanceof Error ? err.stack : 'No stack trace'
    });
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
    console.log('Start of createComment function');
    
    // Get the current user with explicit error handling
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User authentication error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    const user = userData.user;
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }

    // Prepare comment data
    const commentData = {
      post_id: postId,
      content: content.trim(),
      author_id: user.id,
      created_at: new Date().toISOString()
    };

    console.log('Attempting to insert comment:', commentData);

    // Insert the comment with detailed error handling
    const { data, error } = await supabase
      .from('post_comments')
      .insert(commentData)
      .select(`
        id,
        content,
        created_at,
        author:users(
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Comment created successfully:', data);
    return data;
  } catch (err) {
    console.error('Error in createComment:', err);
    throw err;
  }
}
