import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Users, MessageSquare, Ban, UserCheck, Trash2, Settings, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserSearch } from './UserSearch';

interface User {
  id: number;
  username: string;
  displayName: string;
  email: string;
  profilePicture?: string;
  role: string;
  isOnline: boolean;
  isBanned: boolean;
  bannedBy?: number;
  bannedAt?: string;
  banReason?: string;
  createdAt: string;
}

interface AdminLog {
  id: number;
  adminId: number;
  action: string;
  targetType: string;
  targetId: number;
  details: any;
  createdAt: string;
}

interface ChatRoom {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  isPrivate: boolean;
  createdAt: string;
}

export function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin logs
  const { data: logs = [] } = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
  });

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch all chat rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: async () => {
      const response = await fetch('/api/chat-rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return apiRequest('/api/admin/ban-user', 'POST', {
        userId,
        adminId: 1, // In real app, get from auth context
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
      toast({
        title: 'Пользователь заблокирован',
        description: 'Пользователь успешно заблокирован',
      });
      setSelectedUser(null);
      setBanReason('');
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось заблокировать пользователя',
        variant: 'destructive',
      });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('/api/admin/unban-user', 'POST', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
      toast({
        title: 'Пользователь разблокирован',
        description: 'Блокировка пользователя снята',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось разблокировать пользователя',
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
      toast({
        title: 'Комната удалена',
        description: 'Комната успешно удалена',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить комнату',
        variant: 'destructive',
      });
    },
  });

  const handleBanUser = () => {
    if (!selectedUser || !banReason.trim()) return;
    banUserMutation.mutate({ userId: selectedUser.id, reason: banReason });
  };

  const handleUnbanUser = (user: User) => {
    unbanUserMutation.mutate(user.id);
  };

  const handleDeleteRoom = (roomId: number) => {
    deleteRoomMutation.mutate(roomId);
  };

  const filteredUsers = users.filter((user: User) =>
    user.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const formatActionName = (action: string) => {
    const actionNames: Record<string, string> = {
      ban_user: 'Блокировка пользователя',
      unban_user: 'Разблокировка пользователя',
      delete_room: 'Удаление комнаты',
      kick_user: 'Исключение из комнаты',
      promote_user: 'Повышение роли',
      demote_user: 'Понижение роли',
    };
    return actionNames[action] || action;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Панель администратора</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="rooms">
            <MessageSquare className="h-4 w-4 mr-2" />
            Комнаты
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Логи действий
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление пользователями</CardTitle>
              <CardDescription>
                Просмотр, блокировка и управление пользователями
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Поиск пользователей..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
              
              <div className="grid gap-4">
                {filteredUsers.map((user: User) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.profilePicture} />
                        <AvatarFallback>
                          {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{user.displayName}</span>
                          {user.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {user.role === 'admin' && (
                        <Badge variant="destructive">Админ</Badge>
                      )}
                      {user.role === 'moderator' && (
                        <Badge variant="secondary">Модератор</Badge>
                      )}
                      
                      {user.isBanned ? (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-red-500">
                            Заблокирован
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnbanUser(user)}
                            disabled={unbanUserMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Разблокировать
                          </Button>
                        </div>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Заблокировать
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Заблокировать пользователя</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p>Пользователь: {selectedUser?.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                  @{selectedUser?.username}
                                </p>
                              </div>
                              <Textarea
                                placeholder="Причина блокировки..."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                  Отмена
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleBanUser}
                                  disabled={banUserMutation.isPending || !banReason.trim()}
                                >
                                  Заблокировать
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление комнатами</CardTitle>
              <CardDescription>
                Просмотр и удаление комнат чата
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rooms.map((room: ChatRoom) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{room.name}</h3>
                        {room.isPrivate && (
                          <Badge variant="secondary">Приватная</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{room.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Создана: {new Date(room.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    
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
                            onClick={() => handleDeleteRoom(room.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Логи действий администраторов</CardTitle>
              <CardDescription>
                История действий администраторов и модераторов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log: AdminLog) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{formatActionName(log.action)}</Badge>
                        <span className="text-sm">
                          {log.targetType} ID: {log.targetId}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {typeof log.details === 'object' 
                            ? JSON.stringify(log.details) 
                            : log.details}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Логи действий отсутствуют
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}