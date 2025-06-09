import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, ChatRoom, ChatMessage } from '@shared/schema';
import { socketClient } from '@/lib/socket';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, Image, Mic, Video, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useMediaUpload, getMediaTypeFromFile } from '@/lib/media';
import { format } from 'date-fns';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChatRoomComponentProps {
  room: ChatRoom;
}

const ChatRoomComponent: React.FC<ChatRoomComponentProps> = ({ room }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');
  const [mediaUploadOpen, setMediaUploadOpen] = useState(false);
  const { uploadMedia, isUploading } = useMediaUpload();
  
  // Fetch messages and members
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/chat-messages/${room.id}`],
    enabled: !!room,
    refetchInterval: 5000, // Poll every 5 seconds as a fallback
  });
  
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: [`/api/room-members/${room.id}`],
    enabled: !!room,
  });
  
  // Set up WebSocket listener for new messages
  useEffect(() => {
    if (!user || !room) return;
    
    const unsubscribe = socketClient.onMessage('chat_message', (data) => {
      if (data.message.roomId === room.id) {
        // Add the new message to the query cache
        queryClient.setQueryData(
          [`/api/chat-messages/${room.id}`],
          (oldData: ChatMessage[] = []) => [...oldData, data.message]
        );
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, room]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!user || !room || !messageText.trim()) return;
    
    try {
      // Send via WebSocket
      const sent = socketClient.sendChatRoomMessage(room.id, messageText);
      
      if (!sent) {
        // Fallback to API if WebSocket is not connected
        const response = await fetch('/api/chat-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            userId: user.id,
            content: messageText,
            mediaType: 'text',
            mediaUrl: ''
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        
        const newMessage = await response.json();
        
        // Add the new message to the query cache
        queryClient.setQueryData(
          [`/api/chat-messages/${room.id}`],
          (oldData: ChatMessage[] = []) => [...oldData, newMessage]
        );
      }
      
      // Clear input
      setMessageText('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video') => {
    if (!user || !room || !file) return;
    
    try {
      const result = await uploadMedia(file, {
        userId: user.id,
        title: file.name,
        type: getMediaTypeFromFile(file),
        isPublic: false
      });
      
      if (!result) {
        throw new Error('Failed to upload media');
      }
      
      // Send message with media
      const content = `Shared a ${type}: ${result.title}`;
      const mediaUrl = result.url;
      
      // Send via WebSocket
      const sent = socketClient.sendChatRoomMessage(
        room.id, 
        content, 
        type, 
        mediaUrl
      );
      
      if (!sent) {
        // Fallback to API
        const response = await fetch('/api/chat-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            userId: user.id,
            content,
            mediaType: type,
            mediaUrl
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message with media');
        }
        
        const newMessage = await response.json();
        
        // Add the new message to the query cache
        queryClient.setQueryData(
          [`/api/chat-messages/${room.id}`],
          (oldData: ChatMessage[] = []) => [...oldData, newMessage]
        );
      }
      
      // Close media upload
      setMediaUploadOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload and send media. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getMemberById = (id: number): User | undefined => {
    return (Array.isArray(members) ? members : []).find(member => member.id === id);
  };
  
  if (!user) return null;
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-primary/10 p-3 rounded-lg mr-3">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <p className="text-sm text-gray-500">{room.description || 'No description'}</p>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              {(Array.isArray(members) ? members.length : 0)} Members
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Room Members</SheetTitle>
              <SheetDescription>
                People participating in this chat room
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              {membersLoading ? (
                <p className="text-sm text-gray-500">Loading members...</p>
              ) : Array.isArray(members) && members.length > 0 ? (
                <div className="space-y-4">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.profilePicture || undefined} alt={member.displayName} />
                        <AvatarFallback>{member.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.displayName}</p>
                        <p className="text-xs text-gray-500">@{member.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No members found</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message) => {
              const isCurrentUser = message.userId === user.id;
              const date = new Date(message.createdAt);
              const sender = getMemberById(message.userId);
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarImage src={sender?.profilePicture || undefined} alt={sender?.displayName || 'User'} />
                      <AvatarFallback>{(sender?.displayName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div 
                    className={`max-w-[75%] rounded-lg p-3 ${
                      isCurrentUser 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!isCurrentUser && (
                      <p className={`text-xs font-medium mb-1 ${isCurrentUser ? 'text-gray-200' : 'text-gray-700'}`}>
                        {sender?.displayName || 'Unknown User'}
                      </p>
                    )}
                    
                    {message.mediaType === 'image' && (
                      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={message.mediaUrl} 
                          alt="Shared image" 
                          className="max-w-full rounded mb-2"
                        />
                      </a>
                    )}
                    
                    {message.mediaType === 'audio' && (
                      <audio controls className="w-full mb-2">
                        <source src={message.mediaUrl} />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    
                    {message.mediaType === 'video' && (
                      <video controls className="max-w-full rounded mb-2">
                        <source src={message.mediaUrl} />
                        Your browser does not support the video element.
                      </video>
                    )}
                    
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-200' : 'text-gray-500'}`}>
                      {format(date, 'p')}
                    </p>
                  </div>
                  
                  {isCurrentUser && (
                    <Avatar className="h-8 w-8 ml-2 flex-shrink-0">
                      <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                      <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col justify-center items-center h-32 text-center">
              <p className="text-gray-500 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400">Be the first to send a message in this room!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Media upload selection */}
      {mediaUploadOpen && (
        <div className="p-3 border-t border-gray-200 grid grid-cols-3 gap-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleMediaUpload(e.target.files[0], 'image');
                }
              }}
            />
            <Button variant="outline" className="w-full">
              <Image className="mr-2 h-4 w-4" />
              Photo
            </Button>
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleMediaUpload(e.target.files[0], 'audio');
                }
              }}
            />
            <Button variant="outline" className="w-full">
              <Mic className="mr-2 h-4 w-4" />
              Audio
            </Button>
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept="video/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleMediaUpload(e.target.files[0], 'video');
                }
              }}
            />
            <Button variant="outline" className="w-full">
              <Video className="mr-2 h-4 w-4" />
              Video
            </Button>
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMediaUploadOpen(!mediaUploadOpen)}
            disabled={isUploading}
          >
            <Paperclip className="h-5 w-5 text-gray-500" />
          </Button>
          
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 mx-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          <Button 
            disabled={!messageText.trim() || isUploading} 
            onClick={handleSendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomComponent;

// Add auth-context.tsx lib reference
if (typeof document !== 'undefined') {
  console.log('ChatRoom component loaded');
}
