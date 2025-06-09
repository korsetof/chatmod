import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailVerificationProps {
  email?: string;
  onVerificationComplete?: () => void;
  className?: string;
}

export function EmailVerification({ 
  email: initialEmail, 
  onVerificationComplete,
  className 
}: EmailVerificationProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Send verification code mutation
  const sendCodeMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      return apiRequest('POST', '/api/auth/send-verification', {
        email: emailAddress,
      });
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: 'Код отправлен',
        description: 'Проверьте свою почту и введите код подтверждения',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка отправки',
        description: error.message || 'Не удалось отправить код подтверждения',
        variant: 'destructive',
      });
    },
  });

  // Verify code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      return apiRequest('POST', '/api/auth/verify-email', {
        email,
        code,
      });
    },
    onSuccess: () => {
      setIsVerified(true);
      toast({
        title: 'Email подтвержден',
        description: 'Ваш email адрес успешно подтвержден',
      });
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Неверный код',
        description: error.message || 'Код подтверждения неверный или истек',
        variant: 'destructive',
      });
    },
  });

  const handleSendCode = () => {
    if (!email.trim()) return;
    if (!email.includes('@') || !email.includes('.')) {
      toast({
        title: 'Неверный email',
        description: 'Введите корректный email адрес',
        variant: 'destructive',
      });
      return;
    }
    sendCodeMutation.mutate(email);
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({
        title: 'Неверный код',
        description: 'Код должен содержать 6 цифр',
        variant: 'destructive',
      });
      return;
    }
    verifyCodeMutation.mutate({ email, code: verificationCode });
  };

  const handleResendCode = () => {
    sendCodeMutation.mutate(email);
  };

  if (isVerified) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="text-lg font-medium">Email подтвержден</h3>
            <p className="text-muted-foreground">Ваш email адрес успешно подтвержден</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Подтверждение email</span>
        </CardTitle>
        <CardDescription>
          {!codeSent 
            ? 'Введите email адрес для получения кода подтверждения'
            : 'Введите 6-значный код, отправленный на вашу почту'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!codeSent ? (
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Введите email адрес"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sendCodeMutation.isPending}
            />
            
            <Button 
              onClick={handleSendCode}
              disabled={sendCodeMutation.isPending || !email.trim()}
              className="w-full"
            >
              {sendCodeMutation.isPending ? 'Отправка...' : 'Отправить код'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Код отправлен на {email}. Проверьте папку "Спам" если не получили письмо.
              </AlertDescription>
            </Alert>
            
            <Input
              placeholder="Введите 6-значный код"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              disabled={verifyCodeMutation.isPending}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
            
            <div className="flex space-x-2">
              <Button
                onClick={handleVerifyCode}
                disabled={verifyCodeMutation.isPending || verificationCode.length !== 6}
                className="flex-1"
              >
                {verifyCodeMutation.isPending ? 'Проверка...' : 'Подтвердить'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleResendCode}
                disabled={sendCodeMutation.isPending}
              >
                Отправить снова
              </Button>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => {
                setCodeSent(false);
                setVerificationCode('');
              }}
              className="w-full"
            >
              Изменить email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}