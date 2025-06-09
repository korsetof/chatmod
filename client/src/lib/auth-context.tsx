import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@shared/schema';
import { queryClient } from './queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = localStorage.getItem('userId');
        
        if (storedUserId) {
          // Fetch user data
          const response = await fetch(`/api/users/${storedUserId}`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // If we get an error, clear the stored ID
            localStorage.removeItem('userId');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('userId', userData.id.toString());
  };
  
  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('userId');
      
      // Clear query cache
      queryClient.clear();
      
      // Redirect to login page handled by components
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('User refresh error:', error);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
