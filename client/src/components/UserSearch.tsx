import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  displayName: string;
  profilePicture?: string;
  isOnline: boolean;
  role: string;
  isBanned: boolean;
}

interface UserSearchProps {
  onUserSelect?: (user: User) => void;
  onInviteUser?: (user: User) => void;
  roomId?: number;
  currentUserId?: number;
  showInviteButton?: boolean;
}

export function UserSearch({ 
  onUserSelect, 
  onInviteUser, 
  roomId, 
  currentUserId,
  showInviteButton = false 
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [roomMembers, setRoomMembers] = useState<number[]>([]);
  const { toast } = useToast();
  const searchRef = useRef<HTMLDivElement>(null);

  // Get room members if roomId is provided
  useEffect(() => {
    if (roomId) {
      const fetchRoomMembers = async () => {
        try {
          const response = await fetch(`/api/room-members/${roomId}`);
          if (response.ok) {
            const members = await response.json();
            setRoomMembers(members.map((m: User) => m.id));
          }
        } catch (error) {
          console.error('Failed to fetch room members:', error);
        }
      };
      fetchRoomMembers();
    }
  }, [roomId]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: query.length > 0,
  });

  const handleUserClick = (user: User) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleInviteUser = async (user: User) => {
    if (!roomId || !currentUserId) return;

    try {
      await apiRequest('/api/room-members', 'POST', {
        roomId,
        userId: user.id,
        role: 'member'
      });

      setRoomMembers(prev => [...prev, user.id]);
      
      if (onInviteUser) {
        onInviteUser(user);
      }

      toast({
        title: 'Пользователь приглашен',
        description: `${user.displayName} добавлен в комнату`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось пригласить пользователя',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0);
  };

  const handleInputFocus = () => {
    if (query.length > 0) {
      setIsOpen(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск пользователей по @username..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Поиск...
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {query.length > 0 ? 'Пользователи не найдены' : 'Введите запрос для поиска'}
            </div>
          ) : (
            <div className="py-2">
              {users.map((user: User) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-2 hover:bg-muted cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profilePicture} />
                      <AvatarFallback>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{user.displayName}</span>
                        {user.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {user.role === 'admin' && (
                      <Badge variant="destructive">Admin</Badge>
                    )}
                    {user.role === 'moderator' && (
                      <Badge variant="secondary">Mod</Badge>
                    )}
                    {user.isBanned && (
                      <Badge variant="outline" className="text-red-500">Banned</Badge>
                    )}
                    
                    {showInviteButton && roomId && !roomMembers.includes(user.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInviteUser(user);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {showInviteButton && roomId && roomMembers.includes(user.id) && (
                      <Badge variant="secondary">В комнате</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}