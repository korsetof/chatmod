import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileEditor from '@/components/ProfileEditor';
import MediaUpload from '@/components/MediaUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Pencil, Upload, Image, Music, Video } from 'lucide-react';

const ProfileEditorPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Fetch user's media
  const { data: userMedia } = useQuery({
    queryKey: [`/api/media/user/${user?.id}`],
    enabled: !!user,
  });
  
  // Ensure userMedia is always an array
  const mediaArray = Array.isArray(userMedia) ? userMedia : [];
  // Group media items by type
  const imageItems = mediaArray.filter(item => item.type === 'image');
  const audioItems = mediaArray.filter(item => item.type === 'audio');
  const videoItems = mediaArray.filter(item => item.type === 'video');
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Your Profile</h1>
        <p className="text-sm text-gray-500">Customize your profile, upload media, and manage your content</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center">
            <Pencil className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center">
            <Image className="h-4 w-4 mr-2" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileEditor />
        </TabsContent>
        
        <TabsContent value="upload">
          <MediaUpload 
            onSuccess={() => {
              // Stay on upload tab
            }}
          />
        </TabsContent>
        
        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>My Images</CardTitle>
              <CardDescription>Manage your uploaded images</CardDescription>
            </CardHeader>
            <CardContent>
              {imageItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imageItems.map(image => (
                    <div key={image.id} className="relative group overflow-hidden rounded-md">
                      <img 
                        src={image.url} 
                        alt={image.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-white text-sm truncate">{image.title}</p>
                        <p className="text-white text-xs opacity-75">{new Date(image.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">You haven't uploaded any images yet</p>
                  <p className="text-sm text-gray-400 mt-1">Go to the Upload tab to share images</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media">
          <div className="space-y-6">
            {/* Audio section */}
            <Card>
              <CardHeader>
                <CardTitle>My Audio</CardTitle>
                <CardDescription>Manage your uploaded audio files</CardDescription>
              </CardHeader>
              <CardContent>
                {audioItems.length > 0 ? (
                  <div className="space-y-4">
                    {audioItems.map(audio => (
                      <div key={audio.id} className="flex items-center p-3 border rounded-md">
                        <div className="bg-primary/10 p-3 rounded-full mr-3">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{audio.title}</p>
                          <p className="text-sm text-gray-500">{new Date(audio.createdAt).toLocaleDateString()}</p>
                        </div>
                        <audio src={audio.url} controls className="max-w-[200px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">You haven't uploaded any audio files yet</p>
                    <p className="text-sm text-gray-400 mt-1">Go to the Upload tab to share audio</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Video section */}
            <Card>
              <CardHeader>
                <CardTitle>My Videos</CardTitle>
                <CardDescription>Manage your uploaded videos</CardDescription>
              </CardHeader>
              <CardContent>
                {videoItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {videoItems.map(video => (
                      <div key={video.id} className="border rounded-md overflow-hidden">
                        <video 
                          src={video.url} 
                          controls
                          className="w-full"
                        >
                          Your browser does not support the video element.
                        </video>
                        <div className="p-3">
                          <p className="font-medium">{video.title}</p>
                          <p className="text-sm text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">You haven't uploaded any videos yet</p>
                    <p className="text-sm text-gray-400 mt-1">Go to the Upload tab to share videos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileEditorPage;
