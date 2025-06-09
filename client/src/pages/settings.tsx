import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/language-context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, 
} from '@/components/ui/alert-dialog';
import { 
  Bell, 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun, 
  Lock, 
  UserCog, 
  Trash2,
  Loader2,
  Globe
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useTheme } from 'next-themes';
import { useLocation } from 'wouter';

const SettingsPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  
  const handleChangePassword = async () => {
    if (!user) return;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All password fields are required",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      // In a real app, you'd send the password change request to the server
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      
      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      // In a real app, you'd send the account deletion request to the server
      // For now, we'll just log out the user and redirect to the login page
      
      toast({
        title: "Account Deleted",
        description: "Your account has been deleted successfully",
      });
      
      // Log out the user
      await logout();
      
      // Redirect to login page
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center">
            <UserCog className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <Sun className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="max-w-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Your username cannot be changed
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full aspect-square"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message-preview">Message Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Show message content in notifications
                  </p>
                </div>
                <Switch
                  id="message-preview"
                  checked={messagePreview}
                  onCheckedChange={setMessagePreview}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Notification Settings Saved",
                    description: "Your notification preferences have been updated",
                  });
                }}
              >
                Save Notification Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private-profile">Private Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Only allow your connections to view your full profile
                  </p>
                </div>
                <Switch
                  id="private-profile"
                  checked={privateProfile}
                  onCheckedChange={setPrivateProfile}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="blocked-users">Blocked Users</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage users that you've blocked
                </p>
                
                <div className="rounded-md border border-input p-6 text-center">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">You haven't blocked any users yet</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="data-download">Download Your Data</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Download a copy of your data from SocialConnect
                </p>
                
                <Button variant="outline">
                  Request Data Download
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Privacy Settings Saved",
                    description: "Your privacy settings have been updated",
                  });
                }}
              >
                Save Privacy Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your preferred language
                </p>
                
                <LanguageSwitcher />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your preferred theme
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-md border-2 cursor-pointer ${
                      theme === 'light' ? 'border-primary' : 'border-input'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="bg-white text-black p-4 rounded-full mb-2">
                      <Sun className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">Light</span>
                  </div>
                  
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-md border-2 cursor-pointer ${
                      theme === 'dark' ? 'border-primary' : 'border-input'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="bg-gray-900 text-white p-4 rounded-full mb-2">
                      <Moon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                  
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-md border-2 cursor-pointer ${
                      theme === 'system' ? 'border-primary' : 'border-input'
                    }`}
                    onClick={() => setTheme('system')}
                  >
                    <div className="bg-gradient-to-br from-white to-gray-900 p-4 rounded-full mb-2">
                      <div className="flex text-white">
                        <Sun className="h-6 w-6" />
                        <Moon className="h-6 w-6 ml-[-8px]" />
                      </div>
                    </div>
                    <span className="text-sm font-medium">System</span>
                  </div>
                </div>
              </div>
              

              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="font-size">Font Size</Label>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Appearance Settings Saved",
                    description: "Your appearance settings have been updated",
                  });
                }}
              >
                Save Appearance Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
