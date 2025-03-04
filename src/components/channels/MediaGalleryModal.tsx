import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, File, X } from 'lucide-react';

interface MediaGalleryModalProps {
  channelId: string;
  onClose: () => void;
}

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'file';
  filename: string;
  created_at: string;
  post_id: string;
}

export default function MediaGalleryModal({ 
  channelId, 
  onClose 
}: MediaGalleryModalProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchChannelMedia = async () => {
      try {
        const { data, error } = await supabase
          .from('channel_posts')
          .select(`
            post_media(
              id, 
              url, 
              type, 
              filename, 
              created_at
            )
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the media items
        const flattenedMedia = data?.flatMap(post => 
          post.post_media.map(media => ({
            ...media,
            post_id: post.id
          }))
        ) || [];

        setMediaItems(flattenedMedia);
      } catch (err) {
        console.error('Error fetching channel media:', err);
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelMedia();
  }, [channelId]);

  const renderMediaThumbnail = (media: MediaItem) => {
    if (media.type === 'image') {
      return (
        <img 
          src={media.url} 
          alt={media.filename} 
          className="w-full h-full object-cover rounded-lg"
          onClick={() => setSelectedMedia(media)}
        />
      );
    }
    return (
      <div 
        className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg"
        onClick={() => setSelectedMedia(media)}
      >
        <File className="w-12 h-12 text-gray-500" />
        <span className="ml-2 text-sm truncate">{media.filename}</span>
      </div>
    );
  };

  const renderMediaGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-3 gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 aspect-square rounded-lg" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500">
          {error}
        </div>
      );
    }

    if (mediaItems.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8 flex flex-col items-center justify-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">No Media Yet</h3>
          <p className="text-sm">When images or files are shared in this channel, they'll appear here.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2">
        {mediaItems.map((media) => (
          <div 
            key={media.id} 
            className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
          >
            {renderMediaThumbnail(media)}
          </div>
        ))}
      </div>
    );
  };

  const renderSelectedMedia = () => {
    if (!selectedMedia) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-8">
        <button 
          onClick={() => setSelectedMedia(null)}
          className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
        >
          <X className="w-8 h-8" />
        </button>
        
        {selectedMedia.type === 'image' ? (
          <img 
            src={selectedMedia.url} 
            alt={selectedMedia.filename} 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <div className="flex items-center mb-4">
              <File className="w-12 h-12 text-gray-500 mr-4" />
              <div>
                <p className="font-medium">{selectedMedia.filename}</p>
                <a 
                  href={selectedMedia.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  Download File
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">
            Channel Media
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {renderMediaGrid()}
      </div>

      {renderSelectedMedia()}
    </div>
  );
}