import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import ProfileEditorPage from "@/pages/profile-editor";
import MessagesPage from "@/pages/messages";
import ChatroomsPage from "@/pages/chatrooms";
import DiscoverPage from "@/pages/discover";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import RoomManagementPage from "@/pages/room-management";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes with Layout */}
      <Route path="/">
        {() => (
          <Layout>
            <HomePage />
          </Layout>
        )}
      </Route>
      
      <Route path="/profile/:id">
        {(params) => (
          <Layout>
            <ProfilePage id={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/profile-editor">
        {() => (
          <Layout>
            <ProfileEditorPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/messages">
        {() => (
          <Layout>
            <MessagesPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/messages/:id">
        {(params) => (
          <Layout>
            <MessagesPage selectedUserId={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/chatrooms">
        {() => (
          <Layout>
            <ChatroomsPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/chatrooms/:id">
        {(params) => (
          <Layout>
            <ChatroomsPage roomId={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/discover">
        {() => (
          <Layout>
            <DiscoverPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/settings">
        {() => (
          <Layout>
            <SettingsPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/admin">
        {() => (
          <Layout>
            <AdminPage />
          </Layout>
        )}
      </Route>
      
      <Route path="/room-management">
        {() => (
          <Layout>
            <RoomManagementPage />
          </Layout>
        )}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
