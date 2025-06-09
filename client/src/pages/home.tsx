import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import AudioPlayer from '@/components/AudioPlayer';
import MatchSystem from '@/components/MatchSystem';
import { formatDistance } from 'date-fns';
import { Users, Music, Heart, Image, Video, MessageSquare } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Fetch recent public media
  const { data: publicMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ['/api/media/public'],
  });
  
  // Fetch chat rooms
  const { data: chatRooms = [], isLoading: roomsLoading } = useQuery<any[]>({
    queryKey: [`/api/chat-rooms/user/${user?.id}`],
    enabled: !!user,
  });
  
  // Fetch unread message count
  const { data: unreadMessages = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: [`/api/messages/unread-count/${user?.id}`],
    enabled: !!user,
  });
  
  // Filter audio media items
  const mediaArray = Array.isArray(publicMedia) ? publicMedia : [];
  const audioItems = mediaArray.filter(item => item.type === 'audio');
  
  // Filter image media items
  const imageItems = mediaArray.filter(item => item.type === 'image');
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('welcome')}, {user?.displayName}!</h1>
          <p className="text-sm text-neutral-500">{t('dashboard_description')}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left column for stats and quick access */}
        <div className="space-y-6">
          {/* Profile card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.profilePicture || undefined} alt={user?.displayName} />
                  <AvatarFallback>{user?.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-medium truncate">{user?.displayName}</p>
                  <p className="text-sm text-gray-500 truncate">@{user?.username}</p>
                  <div className="mt-2">
                    <Link href={`/profile/${user?.id}`}>
                      <Button variant="outline" size="sm">{t('view_profile')}</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="bg-primary/10 p-3 rounded-lg mb-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{unreadMessages?.count || 0}</p>
                  <p className="text-xs text-gray-500">{t('unread_messages')}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="bg-purple-100 p-3 rounded-lg mb-2">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{chatRooms?.length || 0}</p>
                  <p className="text-xs text-gray-500">{t('chat_rooms')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Chat rooms list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('your_chat_rooms')}</CardTitle>
              <CardDescription>{t('join_conversations')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roomsLoading ? (
                  <p className="text-sm text-gray-500">{t('loading')}...</p>
                ) : chatRooms && chatRooms.length > 0 ? (
                  chatRooms.slice(0, 5).map(room => (
                    <Link key={room.id} href={`/chatrooms/${room.id}`}>
                      <div className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{room.name}</p>
                          <p className="text-xs text-gray-500 truncate">{room.description || 'No description'}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-500">{t('no_chat_rooms_joined')}</p>
                    <Link href="/chatrooms">
                      <Button variant="link" className="mt-1">{t('browse_rooms')}</Button>
                    </Link>
                  </div>
                )}
                
                {chatRooms && chatRooms.length > 0 && (
                  <Link href="/chatrooms">
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      {t('view_all_rooms')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Middle column for audio player and media gallery */}
        <div className="space-y-6">
          {/* Featured audio player */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                <div className="flex items-center">
                  <Music className="h-5 w-5 mr-2" />
                  {t('featured_audio')}
                </div>
              </CardTitle>
              <CardDescription>{t('listen_to_shared_audio')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AudioPlayer playlist={audioItems} />
            </CardContent>
          </Card>
          
          {/* Media gallery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                <div className="flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  {t('media_gallery')}
                </div>
              </CardTitle>
              <CardDescription>{t('recent_shared_images')}</CardDescription>
            </CardHeader>
            <CardContent>
              {mediaLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">{t('loading_media')}...</p>
                </div>
              ) : imageItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {imageItems.slice(0, 6).map(item => (
                    <a 
                      key={item.id} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-md aspect-square"
                    >
                      <img 
                        src={item.url} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform hover:scale-105" 
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">{t('no_images_shared')}</p>
                </div>
              )}
              
              <div className="flex justify-between mt-4">
                <Link href="/discover">
                  <Button variant="outline" size="sm">
                    {t('discover_more')}
                  </Button>
                </Link>
                <Link href="/profile-editor">
                  <Button size="sm">
                    {t('share_media')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column for matching system */}
        <div>
          <MatchSystem />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
