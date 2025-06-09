import React, { useState } from 'react';
import { apiRequest } from './queryClient';

export type MediaType = 'image' | 'audio' | 'video';

export interface UploadOptions {
  userId: number;
  title: string;
  type: MediaType;
  description?: string;
  isPublic?: boolean;
}

export interface MediaUploadResult {
  url: string;
  id: number;
  type: MediaType;
  title: string;
}

export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = async (
    file: File,
    options: UploadOptions
  ): Promise<MediaUploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', options.userId.toString());
      formData.append('title', options.title);
      formData.append('type', options.type);
      
      if (options.description) {
        formData.append('description', options.description);
      }
      
      formData.append('isPublic', options.isPublic === false ? 'false' : 'true');

      // Use XMLHttpRequest to track upload progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressPercent = Math.round((event.loaded / event.total) * 100);
            setProgress(progressPercent);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            setIsUploading(false);
            resolve({
              url: response.url,
              id: response.id,
              type: response.type,
              title: response.title
            });
          } else {
            setIsUploading(false);
            let errorMessage = 'Upload failed';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.message || errorMessage;
            } catch (e) {
              // Ignore JSON parsing error
            }
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        });
        
        xhr.addEventListener('error', () => {
          setIsUploading(false);
          setError('Network error occurred');
          reject(new Error('Network error occurred'));
        });
        
        xhr.addEventListener('abort', () => {
          setIsUploading(false);
          setError('Upload aborted');
          reject(new Error('Upload aborted'));
        });
        
        xhr.open('POST', '/api/media');
        xhr.send(formData);
      });
    } catch (err) {
      setIsUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    }
  };

  return {
    uploadMedia,
    isUploading,
    progress,
    error,
    resetState: () => {
      setIsUploading(false);
      setProgress(0);
      setError(null);
    }
  };
};

export const getMediaTypeFromFile = (file: File): MediaType => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('audio/')) {
    return 'audio';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  // Default to image for unknown types
  return 'image';
};

export const isValidMediaFile = (file: File): boolean => {
  const validTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    // Video
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];
  
  return validTypes.includes(file.type);
};

export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

export const getMediaPreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to create preview'));
    };
    
    reader.readAsDataURL(file);
  });
};

// Hook to handle profile picture uploads
export const useProfilePictureUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProfilePicture = async (userId: number, file: File): Promise<string | null> => {
    if (!file) return null;
    
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/users/${userId}/profile-picture`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();
      setIsUploading(false);
      return data.profilePicture;
    } catch (err) {
      setIsUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    }
  };

  return {
    uploadProfilePicture,
    isUploading,
    error
  };
};
