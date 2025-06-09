import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { HeartIcon, MessageSquare, Music, Image as ImageIcon, Video, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import AudioPlayer from '@/components/AudioPlayer';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ProfilePageProps {
  id: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ id }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const userId = parseInt(id);
  const isOwnProfile = user?.id === userId;
  
  // Fetch profile user data
  interface ProfileUser {
    id: number;
    displayName: string;
    username: string;
    profilePicture?: string;
    createdAt: string;
    bio?: string;
    profileHtml?: string;
  }
  
  const { data: profileUser, isLoading: profileLoading } = useQuery<ProfileUser>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });
  
  // Fetch profile user's media
  const { data: userMedia, isLoading: mediaLoading } = useQuery({
    queryKey: [`/api/media/user/${userId}`],
    enabled: !!userId,
  });
  
  // Check if current user has liked this profile
  const { data: likes } = useQuery({
    queryKey: [`/api/likes/user/${user?.id}`],
    enabled: !!user && !isOwnProfile,
  });
  
  // Filter media by type
  const mediaArray = Array.isArray(userMedia) ? userMedia : [];
  const audioItems = mediaArray.filter(item => item.type === 'audio');
  const imageItems = mediaArray.filter(item => item.type === 'image');
  const videoItems = mediaArray.filter(item => item.type === 'video');
  
  // Check if the current user has already liked this profile
  const hasLiked = (Array.isArray(likes) ? likes : []).some(like => like.likedId === userId);
  
  // Handle liking a profile
  const handleLikeProfile = async () => {
    if (!user || isOwnProfile) return;
    
    try {
      const response = await apiRequest('POST', '/api/likes', {
        likerId: user.id,
        likedId: userId
      });
      const result = await response.json();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/likes/user/${user.id}`]
      });
      
      // Show match notification if this created a match
      if (result.isMatch) {
        toast({
          title: "It's a Match!",
          description: `You and ${(profileUser as any).displayName} have liked each other. Start a conversation!`,
        });
      } else {
        toast({
          title: "Profile Liked",
          description: `You've liked ${profileUser?.displayName}'s profile.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like profile. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle starting a conversation
  const handleStartConversation = () => {
    navigate(`/messages/${userId}`);
  };
  
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!profileUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-gray-500 mb-4">The user you're looking for doesn't exist or has been removed.</p>
        <Link href="/">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profileUser.profilePicture || undefined} alt={profileUser.displayName} />
              <AvatarFallback className="text-2xl">{profileUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{profileUser.displayName}</h1>
                  <p className="text-gray-500">@{profileUser.username}</p>
                </div>
                
                <div className="flex gap-2 mt-4 md:mt-0">
                  {!isOwnProfile && (
                    <>
                      <Button 
                        variant={hasLiked ? "outline" : "default"} 
                        onClick={handleLikeProfile}
                        disabled={hasLiked}
                      >
                        <HeartIcon className="h-4 w-4 mr-2" />
                        {hasLiked ? "Liked" : "Like Profile"}
                      </Button>
                      
                      <Button onClick={handleStartConversation}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </>
                  )}
                  
                  {isOwnProfile && (
                    <Link href="/profile-editor">
                      <Button>
                        Edit Profile
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {format(new Date(profileUser.createdAt), 'MMMM yyyy')}
                </div>
                
                {profileUser.bio && (
                  <p className="text-gray-700 mt-2">{profileUser.bio}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="flex items-center">
                  <Music className="h-3 w-3 mr-1" />
                  {audioItems.length} Audio
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {imageItems.length} Images
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <Video className="h-3 w-3 mr-1" />
                  {videoItems.length} Videos
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Profile Content Tabs */}
      <Tabs defaultValue="html" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="html">HTML Profile</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="audio">Audio Player</TabsTrigger>
        </TabsList>
        
        <TabsContent value="html" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Custom HTML Profile</CardTitle>
              <CardDescription>
                {profileUser.profileHtml 
                  ? "This user has created a custom HTML profile"
                  : "This user hasn't created a custom HTML profile yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileUser.profileHtml ? (
                <div 
                  className="p-4 border rounded-md bg-white"
                  dangerouslySetInnerHTML={{ __html: profileUser.profileHtml }}
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No custom HTML profile yet</p>
                  {isOwnProfile && (
                    <Link href="/profile-editor">
                      <Button variant="link" className="mt-2">Create Your HTML Profile</Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Media Gallery</CardTitle>
              <CardDescription>Photos and videos shared by {profileUser.displayName}</CardDescription>
            </CardHeader>
            <CardContent>
              {mediaLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading media...</p>
                </div>
              ) : (
                <>
                  {imageItems.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Images</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {imageItems.map(item => (
                          <a 
                            key={item.id} 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-md aspect-square relative group"
                          >
                            <img 
                              src={item.url} 
                              alt={item.title} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <div className="text-white">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                <div className="flex items-center text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(item.createdAt), 'MMM d, yyyy')}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {videoItems.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Videos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videoItems.map(item => (
                          <div key={item.id} className="rounded-md overflow-hidden">
                            <video 
                              src={item.url} 
                              controls 
                              className="w-full h-auto" 
                              poster={item.thumbnailUrl} 
                            >
                              Your browser does not support the video tag.
                            </video>
                            <p className="text-sm font-medium mt-1">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {imageItems.length === 0 && videoItems.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-md">
                      <p className="text-gray-500">No media items shared yet</p>
                      {isOwnProfile && (
                        <Link href="/profile-editor">
                          <Button variant="link" className="mt-2">Share Media</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audio" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Audio Player</CardTitle>
              <CardDescription>Listen to audio tracks shared by {profileUser.displayName}</CardDescription>
            </CardHeader>
            <CardContent>
              {mediaLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading audio...</p>
                </div>
              ) : audioItems.length > 0 ? (
                <AudioPlayer playlist={audioItems} />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No audio tracks shared yet</p>
                  {isOwnProfile && (
                    <Link href="/profile-editor">
                      <Button variant="link" className="mt-2">Share Audio</Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
