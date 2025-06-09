import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';
import AudioPlayer from '@/components/AudioPlayer';
import MatchSystem from '@/components/MatchSystem';
import MediaUpload from '@/components/MediaUpload';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Search, Users, Music, Image as ImageIcon, Video, Plus, ExternalLink } from 'lucide-react';

const DiscoverPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  
  // Fetch all users for discovery
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
    select: (data) => (data as any[]).filter((u: any) => u.id !== user?.id),
  });
  
  // Fetch public media
  const { data: publicMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ['/api/media/public'],
  });
  
  // Fetch chat rooms
  const { data: chatRooms, isLoading: roomsLoading } = useQuery({
    queryKey: [`/api/chat-rooms/user/${user?.id}`],
    enabled: !!user,
  });
  
  // Filter users by search query
  const filteredUsers = users ? users.filter((u: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      (u.bio && u.bio.toLowerCase().includes(query))
    );
  }) : [];
  
  // Filter media by type
  const mediaArray = Array.isArray(publicMedia) ? publicMedia : [];
  const audioItems = mediaArray.filter(item => item.type === 'audio');
  const imageItems = mediaArray.filter(item => item.type === 'image');
  const videoItems = mediaArray.filter(item => item.type === 'video');
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-sm text-gray-500">Find users, media, and chat rooms</p>
      </div>
      
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search for users, media, or content..."
          className="pl-10 py-6 text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <Tabs defaultValue="people" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="people" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            People
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center">
            <ImageIcon className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center">
            <Video className="h-4 w-4 mr-2" />
            Videos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="people" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usersLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <Card key={user.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                        <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{user.displayName}</h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                    
                    {user.bio && (
                      <p className="text-sm mb-4 line-clamp-3">{user.bio}</p>
                    )}
                    
                    <div className="flex justify-end">
                      <Link href={`/profile/${user.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Users Found</h3>
                <p className="text-gray-500">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="audio" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Audio Library</h2>
              <Dialog open={showMediaUpload} onOpenChange={setShowMediaUpload}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Share Audio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <MediaUpload 
                    onSuccess={() => setShowMediaUpload(false)}
                    onCancel={() => setShowMediaUpload(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            {mediaLoading ? (
              <div className="lg:col-span-2 text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading audio...</p>
              </div>
            ) : audioItems.length > 0 ? (
              <div className="lg:col-span-2">
                <AudioPlayer playlist={audioItems} />
              </div>
            ) : (
              <div className="lg:col-span-2 text-center py-12">
                <Music className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Audio Tracks Found</h3>
                <p className="text-gray-500 mb-4">Be the first to share an audio track!</p>
                <Button onClick={() => setShowMediaUpload(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Audio
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="images" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Image Gallery</h2>
            <Dialog open={showMediaUpload} onOpenChange={setShowMediaUpload}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Share Image
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <MediaUpload 
                  onSuccess={() => setShowMediaUpload(false)}
                  onCancel={() => setShowMediaUpload(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {mediaLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading images...</p>
            </div>
          ) : imageItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imageItems.map(image => (
                <a 
                  key={image.id}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-md overflow-hidden group relative"
                >
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-sm font-medium truncate">{image.title}</p>
                    <p className="text-white text-xs opacity-75">
                      by {image.uploaderName || 'Unknown'}
                    </p>
                    <div className="absolute top-2 right-2">
                      <div className="bg-black bg-opacity-50 p-1 rounded-full">
                        <ExternalLink className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Images Found</h3>
              <p className="text-gray-500 mb-4">Be the first to share an image!</p>
              <Button onClick={() => setShowMediaUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Share Image
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="videos" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Video Gallery</h2>
            <Dialog open={showMediaUpload} onOpenChange={setShowMediaUpload}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Share Video
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <MediaUpload 
                  onSuccess={() => setShowMediaUpload(false)}
                  onCancel={() => setShowMediaUpload(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {mediaLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading videos...</p>
            </div>
          ) : videoItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videoItems.map(video => (
                <Card key={video.id}>
                  <CardContent className="p-4">
                    <video 
                      src={video.url} 
                      controls
                      className="w-full rounded-md"
                      poster={video.thumbnailUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="mt-2">
                      <h3 className="font-medium">{video.title}</h3>
                      <p className="text-sm text-gray-500">
                        by {video.uploaderName || 'Unknown'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Videos Found</h3>
              <p className="text-gray-500 mb-4">Be the first to share a video!</p>
              <Button onClick={() => setShowMediaUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Share Video
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Find Your Connections</h2>
        <MatchSystem />
      </div>
    </div>
  );
};

export default DiscoverPage;
