import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { AuthForms } from '@/components/AuthForms';
import { useAuth } from '@/lib/auth-context';

const AuthPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col justify-center p-4">
      <div className="max-w-md mx-auto text-center mb-8">
        <div className="h-16 w-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">S</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">SocialConnect</h1>
        <p className="text-gray-600">Your custom social network platform</p>
      </div>
      
      <AuthForms />
      
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3">
              <div className="bg-primary/10 p-2 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium">Custom Profiles</h3>
              <p className="text-xs text-gray-500">Create unique HTML profiles</p>
            </div>
            
            <div className="p-3">
              <div className="bg-secondary/10 p-2 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium">Messaging</h3>
              <p className="text-xs text-gray-500">Private & group chats</p>
            </div>
            
            <div className="p-3">
              <div className="bg-green-50 p-2 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium">Media Sharing</h3>
              <p className="text-xs text-gray-500">Share photos, audio & video</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <footer className="text-center mt-8 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} SocialConnect. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AuthPage;
