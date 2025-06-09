import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { socketClient } from '@/lib/socket';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Users, Plus, Search } from 'lucide-react';
import ChatRoomComponent from '@/components/ChatRoom';
import { useLocation } from 'wouter';

interface ChatroomsPageProps {
  roomId?: string;
}

const ChatroomsPage: React.FC<ChatroomsPageProps> = ({ roomId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Fetch all chat rooms
  const { data: chatRooms, isLoading: roomsLoading } = useQuery({
    queryKey: [`/api/chat-rooms/user/${user?.id}`],
    enabled: !!user,
  });
  
  // Fetch selected room
  const { data: roomData, isLoading: roomDataLoading } = useQuery({
    queryKey: [`/api/chat-rooms/${roomId}`],
    enabled: !!roomId,
  });
  
  // Set up WebSocket for real-time updates
  useEffect(() => {
    if (user) {
      // Subscribe to chat message updates
      const unsubscribe = socketClient.onMessage('chat_message', (data) => {
        // If this is a message for a room, update that room's messages
        if (data.message.roomId) {
          queryClient.invalidateQueries({
            queryKey: [`/api/chat-messages/${data.message.roomId}`]
          });
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [user]);
  
  // Set selected room from URL param or from query result
  useEffect(() => {
    if (roomId && roomData) {
      setSelectedRoom(roomData);
    }
  }, [roomId, roomData]);
  
  // Filter rooms by search query
  const filteredRooms = Array.isArray(chatRooms) ? chatRooms.filter((room: any) => {
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) ||
      (room.description && room.description.toLowerCase().includes(query))
    );
  }) : [];
  
  const handleSelectRoom = (room: any) => {
    setSelectedRoom(room);
    navigate(`/chatrooms/${room.id}`);
  };
  
  const handleCreateRoom = async () => {
    if (!user || !newRoomName.trim()) return;
    
    setIsCreatingRoom(true);
    
    try {
      const newRoomResponse = await apiRequest('POST', '/api/chat-rooms', {
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
        createdBy: user.id,
        isPrivate
      });
      const newRoom = await newRoomResponse.json();
      
      // Add current user to the room
      await apiRequest('POST', '/api/room-members', {
        roomId: newRoom.id,
        userId: user.id
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/chat-rooms/user/${user.id}`]
      });
      
      // Reset form
      setNewRoomName('');
      setNewRoomDescription('');
      setIsPrivate(false);
      setCreateDialogOpen(false);
      
      // Navigate to the new room
      navigate(`/chatrooms/${newRoom.id}`);
      
      toast({
        title: "Room Created",
        description: "Your new chat room has been created successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chat room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6">
        {/* Rooms sidebar */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex justify-between items-center">
                <span>Chat Rooms</span>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      New Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Chat Room</DialogTitle>
                      <DialogDescription>
                        Create a new chat room to connect with other users
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomName">Room Name</Label>
                        <Input
                          id="roomName"
                          placeholder="Enter room name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomDescription">Description (optional)</Label>
                        <Textarea
                          id="roomDescription"
                          placeholder="Enter room description"
                          value={newRoomDescription}
                          onChange={(e) => setNewRoomDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isPrivate">Private Room</Label>
                        <Switch
                          id="isPrivate"
                          checked={isPrivate}
                          onCheckedChange={setIsPrivate}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Private rooms are only visible to members who are invited.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleCreateRoom} 
                        disabled={!newRoomName.trim() || isCreatingRoom}
                      >
                        {isCreatingRoom ? 'Creating...' : 'Create Room'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Join conversations with others</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rooms..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-8rem)] px-2">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-2">
                  {roomsLoading ? (
                    <div className="text-center py-8">
                      <p>Loading rooms...</p>
                    </div>
                  ) : filteredRooms.length > 0 ? (
                    filteredRooms.map((room: any) => (
                      <div
                        key={room.id}
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${
                          selectedRoom?.id === room.id
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleSelectRoom(room)}
                      >
                        <div className={`mr-3 p-2 rounded-full ${room.isPrivate ? 'bg-amber-100' : 'bg-green-100'}`}>
                          <Users className={`h-5 w-5 ${room.isPrivate ? 'text-amber-500' : 'text-green-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{room.name}</p>
                          {room.description && (
                            <p className="text-sm text-gray-500 truncate">{room.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No rooms found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Chat room */}
        <div className="md:col-span-2 h-full">
          {selectedRoom ? (
            <ChatRoomComponent room={selectedRoom} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
                  <Users className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">Chat Rooms</h3>
                <p className="text-gray-500 max-w-md">
                  Select a chat room to join the conversation or create a new room to connect with others.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Room
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatroomsPage;
