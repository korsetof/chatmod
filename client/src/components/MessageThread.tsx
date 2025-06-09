import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Message } from '@shared/schema';
import { socketClient } from '@/lib/socket';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Paperclip, Send, Image, Mic, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useMediaUpload, getMediaTypeFromFile } from '@/lib/media';
import { format } from 'date-fns';

interface MessageThreadProps {
  receiver: User;
}

const MessageThread: React.FC<MessageThreadProps> = ({ receiver }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');
  const [mediaUploadOpen, setMediaUploadOpen] = useState(false);
  const { uploadMedia, isUploading } = useMediaUpload();
  
  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: [`/api/messages/${user?.id}/${receiver.id}`],
    enabled: !!user && !!receiver,
    refetchInterval: 5000, // Poll every 5 seconds as a fallback
  });
  
  // Set up WebSocket listener for new messages
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = socketClient.onMessage('private_message', (data) => {
      if (data.message.senderId === receiver.id && data.message.receiverId === user.id) {
        // Add the new message to the query cache
        queryClient.setQueryData(
          [`/api/messages/${user.id}/${receiver.id}`],
          (oldData: Message[] = []) => [...oldData, data.message]
        );
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, receiver.id]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return;
    
    try {
      // Send via WebSocket
      const sent = socketClient.sendPrivateMessage(receiver.id, messageText);
      
      if (!sent) {
        // Fallback to API if WebSocket is not connected
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            receiverId: receiver.id,
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
          [`/api/messages/${user.id}/${receiver.id}`],
          (oldData: Message[] = []) => [...oldData, newMessage]
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
    if (!user || !file) return;
    
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
      const sent = socketClient.sendPrivateMessage(
        receiver.id, 
        content, 
        type, 
        mediaUrl
      );
      
      if (!sent) {
        // Fallback to API
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            receiverId: receiver.id,
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
          [`/api/messages/${user.id}/${receiver.id}`],
          (oldData: Message[] = []) => [...oldData, newMessage]
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
  
  if (!user) return null;
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={receiver.profilePicture || undefined} alt={receiver.displayName} />
          <AvatarFallback>{receiver.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{receiver.displayName}</h2>
          <p className="text-sm text-gray-500">@{receiver.username}</p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : Array.isArray(messages) && messages.length > 0 ? (
          (messages as Message[]).map((message) => {
            const isCurrentUser = message.senderId === user.id;
            const date = message.createdAt ? new Date(message.createdAt) : new Date();
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                    <AvatarImage src={receiver.profilePicture || undefined} alt={receiver.displayName} />
                    <AvatarFallback>{receiver.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                
                <div 
                  className={`max-w-[75%] rounded-lg p-3 ${
                    isCurrentUser 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.mediaType === 'image' && (
                    <a href={message.mediaUrl || undefined} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={message.mediaUrl || undefined} 
                        alt="Shared image" 
                        className="max-w-full rounded mb-2"
                      />
                    </a>
                  )}
                  
                  {message.mediaType === 'audio' && (
                    <audio controls className="w-full mb-2">
                      <source src={message.mediaUrl || undefined} />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  
                  {message.mediaType === 'video' && (
                    <video controls className="max-w-full rounded mb-2">
                      <source src={message.mediaUrl || undefined} />
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
          <div className="flex flex-col justify-center items-center h-full text-center">
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Start a conversation with {receiver.displayName}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
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

export default MessageThread;

// Add auth-context.tsx lib reference
if (typeof document !== 'undefined') {
  console.log('MessageThread component loaded');
}
