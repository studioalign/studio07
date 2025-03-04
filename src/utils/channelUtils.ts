import { supabase } from '../lib/supabase';

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
    if (files.length > 0) {
      for (const file of files) {
        try {
          // Upload file to storage
          const fileExt = file.name.split('.').pop();
          const filePath = `channel-media/${post.id}/${Date.now()}.${fileExt}`;
          
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
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('channel-media')
            .getPublicUrl(filePath);

          // Create media record
          console.log('Attempting to insert media record:', {
            post_id: post.id,
            url: publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            filename: file.name,
            size_bytes: file.size,
          });

          const { error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: post.id,
              url: publicUrl,
              type: file.type.startsWith('image/') ? 'image' : 'file',
              filename: file.name,
              size_bytes: file.size,
            });

          if (mediaError) {
            console.error('Media insertion error:', {
              code: mediaError.code,
              message: mediaError.message,
              details: mediaError.details,
              hint: mediaError.hint
            });
            throw mediaError;
          }
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          // Optionally handle file processing errors
          throw fileError;
        }
      }
    }

    return post;
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

    // Verify post exists
    const { data: postCheck, error: postCheckError } = await supabase
      .from('channel_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postCheckError) {
      console.error('Post verification error:', postCheckError);
      throw new Error(`Cannot find post with ID ${postId}: ${postCheckError.message}`);
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
      console.error('Supabase insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('Comment created successfully:', data);
    return data;
  } catch (err) {
    console.error('Comprehensive error in createComment:', {
      errorType: typeof err,
      errorConstructor: err?.constructor?.name,
      errorObject: err,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      errorStack: err instanceof Error ? err.stack : 'No stack trace'
    });
    
    // Rethrow the original error
    throw err;
  }
}