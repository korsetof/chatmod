import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useProfilePictureUpload } from '@/lib/media';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface HTMLEditorProps {
  initialContent: string;
  onSave: (html: string) => void;
}

const HTMLEditor: React.FC<HTMLEditorProps> = ({ initialContent, onSave }) => {
  const [html, setHtml] = useState(initialContent);

  return (
    <div className="space-y-4">
      <div className="border rounded-md p-4">
        <Textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Enter your HTML profile content here..."
          className="min-h-[300px] font-mono"
        />
      </div>
      
      <div className="border rounded-md p-4">
        <h3 className="text-sm font-medium mb-2">Preview:</h3>
        <div 
          className="p-4 border rounded-md bg-white"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      
      <Button onClick={() => onSave(html)}>Save HTML Profile</Button>
    </div>
  );
};

const ProfileEditor: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { uploadProfilePicture, isUploading } = useProfilePictureUpload();
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState('default');
  const [isSaving, setIsSaving] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio ?? '');
      setTheme(user.theme ?? 'default');
    }
  }, [user]);
  
  useEffect(() => {
    // Create a preview URL when a file is selected
    if (profilePictureFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(profilePictureFile);
    } else {
      setPreviewUrl(null);
    }
    
    // Clean up the preview URL when the component unmounts
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [profilePictureFile]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePictureFile(e.target.files[0]);
    }
  };
  
  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Upload profile picture if a new one was selected
      let profilePictureUrl = user.profilePicture;
      
      if (profilePictureFile) {
        const uploadedUrl = await uploadProfilePicture(user.id, profilePictureFile);
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        }
      }
      
      // Update user profile
      await apiRequest('PATCH', `/api/users/${user.id}`, {
        displayName,
        bio,
        theme,
        profilePicture: profilePictureUrl,
      });
      
      // Refresh user data
      await refreshUser();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleHtmlSave = async (html: string) => {
    if (!user) return;
    
    try {
      await apiRequest('PATCH', `/api/users/${user.id}`, {
        profileHtml: html,
      });
      
      // Refresh user data
      await refreshUser();
      
      toast({
        title: "HTML Profile Updated",
        description: "Your HTML profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Your Profile</h1>
      
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="html">HTML Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your profile information and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={previewUrl || user.profilePicture || undefined} alt={user.displayName} />
                    <AvatarFallback className="text-2xl">{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() => document.getElementById('profile-picture-input')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Input
                    id="profile-picture-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="mt-1 h-24"
                />
              </div>
              
              <div>
                <Label htmlFor="theme">Profile Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme" className="mt-1">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleProfileUpdate} 
                disabled={isSaving || isUploading}
                className="ml-auto"
              >
                {(isSaving || isUploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="html">
          <Card>
            <CardHeader>
              <CardTitle>HTML Profile</CardTitle>
              <CardDescription>Customize your profile with HTML</CardDescription>
            </CardHeader>
            <CardContent>
              <HTMLEditor 
                initialContent={user.profileHtml ?? ''} 
                onSave={handleHtmlSave} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileEditor;

// Add auth-context.tsx lib reference
if (typeof document !== 'undefined') {
  console.log('ProfileEditor component loaded');
}
