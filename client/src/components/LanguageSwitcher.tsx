import React from 'react';
import { useLanguage } from '@/lib/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LanguageSwitcherProps {
  showLabel?: boolean;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ showLabel = true, className = '' }) => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'ru');
  };

  return (
    <div className={`flex items-center ${showLabel ? 'space-x-4' : ''} ${className}`}>
      {showLabel && <Label htmlFor="language-select">{t('language')}</Label>}
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger id="language-select" className={showLabel ? 'w-[180px]' : 'w-[120px]'}>
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t('english')}</SelectItem>
          <SelectItem value="ru">{t('russian')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;