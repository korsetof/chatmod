import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import MessageThread from '@/components/MessageThread';
import { useLocation } from 'wouter';
import { socketClient } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

interface MessagesPageProps {
  selectedUserId?: string;
}

const MessagesPage: React.FC<MessagesPageProps> = ({ selectedUserId }) => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Fetch all users for contacts list
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
    select: (data) => (data as any[]).filter((u: any) => u.id !== user?.id),
  });
  
  // Set up WebSocket for real-time updates
  useEffect(() => {
    if (user) {
      // Subscribe to private message updates
      const unsubscribe = socketClient.onMessage('private_message', (data) => {
        // If this is a message for the current user, update unread message count
        if (data.message.receiverId === user.id) {
          queryClient.invalidateQueries({
            queryKey: [`/api/messages/unread-count/${user.id}`]
          });
          
          // If we're currently viewing messages with this sender, invalidate that query too
          queryClient.invalidateQueries({
            queryKey: [`/api/messages/${user.id}/${data.message.senderId}`]
          });
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [user]);
  
  // Set selected user from URL param
  useEffect(() => {
    if (selectedUserId && users) {
      const user = users.find((u: any) => u.id.toString() === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, users]);
  
  // Filter users by search query
  const filteredUsers = users ? users.filter((user: any) => {
    const query = searchQuery.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  }) : [];
  
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    navigate(`/messages/${user.id}`);
  };
  
  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6">
        {/* Contacts sidebar */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contacts..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {usersLoading ? (
                    <div className="text-center py-8">
                      <p>Loading contacts...</p>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((contact: any) => (
                      <div
                        key={contact.id}
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${
                          selectedUser?.id === contact.id
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleSelectUser(contact)}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={contact.profilePicture || undefined} alt={contact.displayName} />
                          <AvatarFallback>{contact.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{contact.displayName}</p>
                          <p className="text-sm text-gray-500 truncate">@{contact.username}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No contacts found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Message thread */}
        <div className="md:col-span-2 h-full">
          {selectedUser ? (
            <MessageThread receiver={selectedUser} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Your Messages</h3>
                <p className="text-gray-500 max-w-md">
                  Select a contact to start messaging. Share text, photos, audio, and videos privately.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
