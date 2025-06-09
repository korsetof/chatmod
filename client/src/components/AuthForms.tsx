import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { EmailVerification } from "@/components/EmailVerification";

const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters long" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  confirmPassword: z.string(),
  email: z.string().email({ message: "Please enter a valid email address" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function AuthForms() {
  const [activeTab, setActiveTab] = React.useState("login");
  const [showEmailVerification, setShowEmailVerification] = React.useState(false);
  const [registeredEmail, setRegisteredEmail] = React.useState("");
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();

  if (showEmailVerification) {
    return (
      <div className="w-full max-w-md mx-auto">
        <EmailVerification 
          email={registeredEmail}
          onVerificationComplete={() => {
            setShowEmailVerification(false);
            toast({
              title: "Аккаунт создан",
              description: "Ваш аккаунт успешно создан и подтвержден. Теперь вы можете войти.",
            });
            setActiveTab("login");
          }}
        />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">{t('welcome')} SocialConnect</CardTitle>
        <CardDescription className="text-center">{t('connect_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('login')}</TabsTrigger>
            <TabsTrigger value="register">{t('register')}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={(userData) => {
              login(userData);
              navigate("/");
            }} />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm onSuccess={(email: string) => {
              setRegisteredEmail(email);
              setShowEmailVerification(true);
            }} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface LoginFormProps {
  onSuccess: (userData: any) => void;
}

function LoginForm({ onSuccess }: LoginFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const [isLoading, setIsLoading] = React.useState(false);
  
  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      const userData = await response.json();
      onSuccess(userData);
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('username')}</FormLabel>
              <FormControl>
                <Input placeholder={`${t('username')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={`${t('password')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('loading') + "..." : t('login_button')}
        </Button>
      </form>
    </Form>
  );
}

interface RegisterFormProps {
  onSuccess: (email: string) => void;
}

function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const [isLoading, setIsLoading] = React.useState(false);
  
  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      // Remove confirmPassword as it's not part of our API schema
      const { confirmPassword, ...userData } = values;
      
      const response = await apiRequest('/api/auth/register', 'POST', userData);
      onSuccess(values.email);
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('username')}</FormLabel>
              <FormControl>
                <Input placeholder={`${t('username')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('display_name')}</FormLabel>
              <FormControl>
                <Input placeholder={`${t('display_name')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={`${t('password')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirm_password')}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={`${t('confirm_password')}...`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? `${t('creating')}...` : t('create_account')}
        </Button>
      </form>
    </Form>
  );
}

// Add a lib/auth-context.tsx import reference
if (typeof document !== 'undefined') {
  console.log('Auth forms component loaded');
}
