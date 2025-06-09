import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Menu Toggle Button */}
      <div className="lg:hidden fixed z-50 bottom-4 right-4">
        <Button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          variant="default" 
          size="icon" 
          className="rounded-full shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} user={user} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-8 px-4 sm:px-6 lg:px-8 lg:ml-64">
        <div className="max-w-7xl mx-auto pb-12">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="mt-auto py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-gray-200 pt-6 text-center">
              <p className="text-sm text-gray-500">© {new Date().getFullYear()} SocialConnect. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Layout;

// Add auth-context.tsx lib reference
if (typeof document !== 'undefined') {
  console.log('Layout component loaded');
}
