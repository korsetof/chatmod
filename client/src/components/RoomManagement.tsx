import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, UserPlus, Settings, Users, Crown, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserSearch } from './UserSearch';

interface User {
  id: number;
  username: string;
  displayName: string;
  profilePicture?: string;
  isOnline: boolean;
  role: string;
}

interface ChatRoom {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  isPrivate: boolean;
  createdAt: string;
}

interface RoomMember {
  user: User;
  role: string;
  joinedAt: string;
}

interface RoomManagementProps {
  currentUserId: number;
  userRole: string;
}

export function RoomManagement({ currentUserId, userRole }: RoomManagementProps) {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['chatRooms', 'user', currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/user/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    },
  });

  // Fetch room members for selected room
  const { data: roomMembers = [] } = useQuery({
    queryKey: ['roomMembers', selectedRoom?.id],
    queryFn: async () => {
      if (!selectedRoom) return [];
      const response = await fetch(`/api/room-members/${selectedRoom.id}`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const members = await response.json();
      
      // Get role for each member
      const membersWithRoles = await Promise.all(
        members.map(async (member: User) => {
          const roleResponse = await fetch(`/api/room-members/${selectedRoom.id}/${member.id}/role`);
          const roleData = roleResponse.ok ? await roleResponse.json() : { role: 'member' };
          return {
            user: member,
            role: roleData.role,
            joinedAt: new Date().toISOString() // Mock data
          };
        })
      );
      
      return membersWithRoles;
    },
    enabled: !!selectedRoom,
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; description: string; isPrivate: boolean }) => {
      return apiRequest('/api/chat-rooms', 'POST', {
        ...roomData,
        createdBy: currentUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      toast({
        title: 'Комната создана',
        description: 'Новая комната успешно создана',
      });
      setCreateRoomOpen(false);
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomIsPrivate(false);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать комнату',
        variant: 'destructive',
      });
    },
  });

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      return apiRequest(`/api/chat-rooms/${roomId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      toast({
        title: 'Комната удалена',
        description: 'Комната успешно удалена',
      });
      setSelectedRoom(null);
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить комнату',
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: number; userId: number }) => {
      return apiRequest(`/api/room-members/${roomId}/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', selectedRoom?.id] });
      toast({
        title: 'Участник исключен',
        description: 'Участник успешно исключен из комнаты',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось исключить участника',
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roomId, userId, role }: { roomId: number; userId: number; role: string }) => {
      return apiRequest(`/api/room-members/${roomId}/${userId}/role`, 'PATCH', { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomMembers', selectedRoom?.id] });
      toast({
        title: 'Роль обновлена',
        description: 'Роль участника успешно обновлена',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
    },
  });

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    createRoomMutation.mutate({
      name: newRoomName,
      description: newRoomDescription,
      isPrivate: newRoomIsPrivate,
    });
  };

  const handleDeleteRoom = (room: ChatRoom) => {
    deleteRoomMutation.mutate(room.id);
  };

  const handleRemoveMember = (member: RoomMember) => {
    if (!selectedRoom) return;
    removeMemberMutation.mutate({
      roomId: selectedRoom.id,
      userId: member.user.id,
    });
  };

  const handleUpdateRole = (member: RoomMember, newRole: string) => {
    if (!selectedRoom) return;
    updateRoleMutation.mutate({
      roomId: selectedRoom.id,
      userId: member.user.id,
      role: newRole,
    });
  };

  const canManageRoom = (room: ChatRoom) => {
    return room.createdBy === currentUserId || userRole === 'admin' || userRole === 'moderator';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление комнатами</h2>
        <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать комнату
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новую комнату</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Название комнаты"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <Textarea
                placeholder="Описание комнаты (необязательно)"
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={newRoomIsPrivate}
                  onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                />
                <label htmlFor="private">Приватная комната</label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateRoomOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoomMutation.isPending || !newRoomName.trim()}
                >
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rooms.map((room: ChatRoom) => (
          <Card key={room.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    {room.isPrivate && (
                      <Badge variant="secondary">Приватная</Badge>
                    )}
                  </div>
                  <CardDescription>{room.description}</CardDescription>
                </div>
                
                {canManageRoom(room) && (
                  <div className="flex items-center space-x-2">
                    <Dialog open={manageMembersOpen && selectedRoom?.id === room.id} 
                           onOpenChange={(open) => {
                             setManageMembersOpen(open);
                             if (open) setSelectedRoom(room);
                           }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Users className="h-4 w-4 mr-1" />
                          Участники
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Управление участниками - {room.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <UserSearch
                            roomId={room.id}
                            currentUserId={currentUserId}
                            showInviteButton={true}
                            onInviteUser={() => {
                              queryClient.invalidateQueries({ queryKey: ['roomMembers', room.id] });
                            }}
                          />
                          
                          <div className="space-y-2">
                            <h4 className="font-medium">Текущие участники</h4>
                            {roomMembers.map((member: RoomMember) => (
                              <div key={member.user.id} className="flex items-center justify-between p-3 border rounded">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.user.profilePicture} />
                                    <AvatarFallback>
                                      {member.user.displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{member.user.displayName}</span>
                                      {getRoleIcon(member.role)}
                                      {member.user.isOnline && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      @{member.user.username}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(role) => handleUpdateRole(member, role)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">Участник</SelectItem>
                                      <SelectItem value="moderator">Модератор</SelectItem>
                                      <SelectItem value="admin">Админ</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  {member.user.id !== currentUserId && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      Исключить
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Удалить
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить комнату?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Комната "{room.name}" и все сообщения 
                            в ней будут удалены навсегда.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRoom(room)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Создана: {new Date(room.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {rooms.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">У вас пока нет комнат</p>
              <Button className="mt-4" onClick={() => setCreateRoomOpen(true)}>
                Создать первую комнату
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}