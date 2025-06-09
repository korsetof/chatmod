import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, X, MessageSquare, ThumbsUp, User } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';

const MatchSystem: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('discover');
  
  // Fetch all users for discovery (excluding current user)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
    select: (data) => (data as any[]).filter((u: any) => u.id !== user?.id),
  });
  
  // Fetch users who the current user has liked
  const { data: likes, isLoading: likesLoading } = useQuery({
    queryKey: [`/api/likes/user/${user?.id}`],
    enabled: !!user && activeTab === 'likes',
  });
  
  // Fetch matches (mutual likes)
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: [`/api/matches/${user?.id}`],
    enabled: !!user && activeTab === 'matches',
  });
  
  // Handle liking a user
  const handleLike = async (likedUserId: number) => {
    if (!user) return;
    
    try {
      const response = await apiRequest('POST', '/api/likes', {
        likerId: user.id,
        likedId: likedUserId
      });
      const result = typeof response.json === 'function' ? await response.json() : response;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/likes/user/${user.id}`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/matches/${user.id}`]
      });

      // Show match notification if this created a match
      if (result.isMatch) {
        const matchedUser = users?.find((u: any) => u.id === likedUserId);
        if (matchedUser) {
          toast({
            title: "It's a Match!",
            description: `You and ${matchedUser.displayName} have liked each other. Start a conversation!`,
          });
        }
      } else {
        toast({
          title: "Liked!",
          description: "You've liked this profile.",
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
  
  // Find users who the current user has liked
  const getLikedUserIds = () => {
    if (!Array.isArray(likes)) return [];
    return likes.map((like: any) => like.likedId);
  };
  const likedUserIds = getLikedUserIds();
  
  // Filter users who haven't been liked yet for discovery
  const discoverUsers = users?.filter((user: any) => !likedUserIds.includes(user.id)) || [];
  
  // Get liked users' full profiles
  const likedUsers = users?.filter((user: any) => likedUserIds.includes(user.id)) || [];
  
  const isLoading = usersLoading || likesLoading || matchesLoading;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Connect with Others</CardTitle>
        <CardDescription>Discover new profiles, see your likes, and view your matches</CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">
              <User className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="likes">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Likes
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Heart className="h-4 w-4 mr-2" />
              Matches
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="discover" className="mt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading profiles...</p>
              </div>
            ) : discoverUsers.length > 0 ? (
              <div className="space-y-6">
                {discoverUsers.map((discoverUser: any) => (
                  <div key={discoverUser.id} className="p-4 border rounded-lg">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-14 w-14 mr-4">
                        <AvatarImage src={discoverUser.profilePicture || undefined} alt={discoverUser.displayName} />
                        <AvatarFallback>{discoverUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/profile/${discoverUser.id}`}>
                          <a className="font-semibold text-lg hover:text-primary">{discoverUser.displayName}</a>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{discoverUser.username}</p>
                      </div>
                    </div>
                    
                    {discoverUser.bio && (
                      <p className="text-sm mb-4 line-clamp-2">{discoverUser.bio}</p>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Skip this user in discovery feed
                          queryClient.setQueryData(
                            ['/api/users'],
                            (oldData: any[]) => oldData.filter(u => u.id !== discoverUser.id)
                          );
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Skip
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleLike(discoverUser.id)}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Like
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No More Profiles</h3>
                <p className="text-muted-foreground">You've viewed all available profiles. Check back later!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="likes" className="mt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading likes...</p>
              </div>
            ) : likedUsers.length > 0 ? (
              <div className="space-y-4">
                {likedUsers.map((likedUser: any) => (
                  <div key={likedUser.id} className="p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={likedUser.profilePicture || undefined} alt={likedUser.displayName} />
                        <AvatarFallback>{likedUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Link href={`/profile/${likedUser.id}`}>
                          <a className="font-semibold hover:text-primary">{likedUser.displayName}</a>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{likedUser.username}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Liked
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Likes Yet</h3>
                <p className="text-muted-foreground">You haven't liked any profiles. Discover new people!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="matches" className="mt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading matches...</p>
              </div>
            ) : Array.isArray(matches) && matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((match: any) => (
                  <div key={match.id} className="p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={match.profilePicture || undefined} alt={match.displayName} />
                        <AvatarFallback>{match.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Link href={`/profile/${match.id}`}>
                          <a className="font-semibold hover:text-primary">{match.displayName}</a>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{match.username}</p>
                      </div>
                      <Link href={`/messages/${match.id}`}>
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Matches Yet</h3>
                <p className="text-muted-foreground">When you and someone both like each other, you'll see them here.</p>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="text-sm text-muted-foreground text-center">
        <p className="w-full">
          Connect with people who share your interests and build your network!
        </p>
      </CardFooter>
    </Card>
  );
};

export default MatchSystem;
