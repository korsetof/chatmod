import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMediaUpload, getMediaTypeFromFile, isValidMediaFile, getMediaPreview } from '@/lib/media';
import { useAuth } from '@/lib/auth-context';
import { Upload, Image, Music, Video, X } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface MediaUploadProps {
  onSuccess?: (mediaItem: any) => void;
  onCancel?: () => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadMedia, isUploading, progress, error, resetState } = useMediaUpload();
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!isValidMediaFile(selectedFile)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a supported file type (image, audio, or video).",
          variant: "destructive",
        });
        return;
      }
      
      // Set file and default title
      setFile(selectedFile);
      setTitle(selectedFile.name.split('.').slice(0, -1).join('.'));
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        try {
          const previewUrl = await getMediaPreview(selectedFile);
          setPreview(previewUrl);
        } catch (error) {
          console.error("Failed to create preview:", error);
        }
      } else {
        setPreview(null);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!file || !user) return;
    
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for your upload.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const mediaType = getMediaTypeFromFile(file);
      const result = await uploadMedia(file, {
        userId: user.id,
        title: title.trim(),
        type: mediaType,
        description: description.trim(),
        isPublic
      });
      
      if (result) {
        toast({
          title: "Upload Successful",
          description: `Your ${mediaType} was uploaded successfully.`
        });
        
        // Invalidate queries to refresh media lists
        queryClient.invalidateQueries({
          queryKey: [`/api/media/user/${user.id}`]
        });
        queryClient.invalidateQueries({
          queryKey: ['/api/media/public']
        });
        
        // Call success callback if provided
        if (onSuccess) onSuccess(result);
        
        // Reset form
        handleReset();
      }
    } catch (err) {
      toast({
        title: "Upload Failed",
        description: error || "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setPreview(null);
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload Media</CardTitle>
        <CardDescription>Share your photos, audio, or videos with your network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,audio/*,video/*"
            />
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-medium">Click to select a file</p>
            <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
            <p className="text-xs text-gray-500 mt-4">
              Supported formats: JPG, PNG, GIF, MP3, WAV, MP4, WEBM
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="p-4 bg-gray-50 rounded-lg">
                {preview ? (
                  <div className="relative mx-auto max-h-48 overflow-hidden rounded-md">
                    <img src={preview} alt="Preview" className="mx-auto" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-28">
                    {file.type.startsWith('audio/') ? (
                      <Music className="h-12 w-12 text-primary/70" />
                    ) : file.type.startsWith('video/') ? (
                      <Video className="h-12 w-12 text-primary/70" />
                    ) : (
                      <Image className="h-12 w-12 text-primary/70" />
                    )}
                  </div>
                )}
                <p className="text-sm text-center mt-2 text-gray-600 truncate">{file.name}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={handleReset}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your upload a title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="public" className="cursor-pointer">Make this upload public</Label>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-center text-gray-500">{progress}% uploaded</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel || handleReset}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading || !title.trim()}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MediaUpload;
