import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Home, MessageSquareText, Users, Music, Search, Settings, LogOut, Globe } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: User;
}

interface ChatRoom {
  id: string;
  name: string;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen, user }) => {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { t } = useLanguage();
  
  interface UnreadCountResponse {
    count: number;
  }

  const { data: unreadCount } = useQuery<UnreadCountResponse>({
    queryKey: [`/api/messages/unread-count/${user.id}`],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  const { data: chatRooms } = useQuery<ChatRoom[]>({
    queryKey: [`/api/chat-rooms/user/${user.id}`],
  });
  
  // Close sidebar when clicking outside on mobile
  const handleClickOutside = (e: MouseEvent) => {
    if (open && e.target instanceof Element) {
      const sidebar = document.getElementById('sidebar');
      const toggleButton = document.getElementById('mobile-menu-toggle');
      
      if (sidebar && toggleButton) {
        const isClickInsideSidebar = sidebar.contains(e.target);
        const isClickOnToggleButton = toggleButton.contains(e.target);
        
        if (!isClickInsideSidebar && !isClickOnToggleButton && window.innerWidth < 1024) {
          setOpen(false);
        }
      }
    }
  };
  
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);
  
  const sidebarClasses = open 
    ? "w-64 translate-x-0" 
    : "w-0 -translate-x-full lg:w-64 lg:translate-x-0";
  
  return (
    <aside 
      id="sidebar" 
      className={`bg-white border-r border-gray-200 fixed inset-y-0 left-0 transform transition duration-200 ease-in-out z-50 lg:z-0 ${sidebarClasses}`}
    >
      <div className="flex flex-col h-full">
        {/* Brand Logo */}
        <div className="px-6 py-5 flex items-center border-b border-gray-200">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center mr-2">
            <span className="text-white text-lg font-bold">S</span>
          </div>
          <span className="text-xl font-semibold">SocialConnect</span>
        </div>

        {/* User Profile Summary */}
        <div className="p-4 border-b border-gray-200">
          <Link href={`/profile/${user.id}`}>
            <div className="flex items-center space-x-3 cursor-pointer">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user.displayName}</p>
                <p className="text-xs text-neutral-500">@{user.username}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide pt-4">
          <div className="px-4 space-y-1">
            <Link href="/">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location === '/' ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <Home className="h-5 w-5 mr-3" />
                {t('home')}
              </a>
            </Link>
            
            <Link href="/messages">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location.startsWith('/messages') ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <MessageSquareText className="h-5 w-5 mr-3" />
                {t('messages')}
                {(unreadCount?.count ?? 0) > 0 && (
                  <Badge variant="default" className="ml-auto">{unreadCount?.count ?? 0}</Badge>
                )}
              </a>
            </Link>
            
            <Link href="/discover">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location === '/discover' ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <Search className="h-5 w-5 mr-3" />
                {t('discover')}
              </a>
            </Link>
            
            <Link href="/profile-editor">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location === '/profile-editor' ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <Users className="h-5 w-5 mr-3" />
                {t('edit_profile')}
              </a>
            </Link>
            
            <Link href="/chatrooms">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location.startsWith('/chatrooms') ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <Bell className="h-5 w-5 mr-3" />
                {t('chat_rooms')}
              </a>
            </Link>
          </div>

          {chatRooms && chatRooms.length > 0 && (
            <div className="mt-6 px-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('chat_rooms')}
              </h3>
              <div className="mt-2 space-y-1">
                {chatRooms.map((room) => (
                  <Link key={room.id} href={`/chatrooms/${room.id}`}>
                    <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location === `/chatrooms/${room.id}` ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {room.name}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Settings and Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-1">
            <Link href="/settings">
              <a className={`flex items-center px-3 py-2 text-sm rounded-md ${location === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-neutral-500 hover:bg-gray-100'} transition duration-150`}>
                <Settings className="h-5 w-5 mr-3" />
                {t('settings')}
              </a>
            </Link>
            
            <div className="flex items-center px-3 py-2 text-sm rounded-md text-neutral-500 transition duration-150">
              <Globe className="h-5 w-5 mr-3" />
              <LanguageSwitcher showLabel={false} />
            </div>
            
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="flex items-center px-3 py-2 text-sm rounded-md text-neutral-500 hover:bg-gray-100 transition duration-150"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {t('logout')}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

// Add lib reference
if (typeof document !== 'undefined') {
  console.log('Sidebar component loaded');
}
