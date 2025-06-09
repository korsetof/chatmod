import React, { createContext, useContext, useState, useEffect } from 'react';

// Определяем доступные языки
export type Language = 'en' | 'ru';

// Типы для контекста языка
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

// Создаем контекст с начальными значениями
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
});

// Словари переводов
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Auth
    'login': 'Login',
    'register': 'Register',
    'username': 'Username',
    'password': 'Password',
    'confirm_password': 'Confirm Password',
    'display_name': 'Display Name',
    'login_button': 'Log In',
    'register_button': 'Register',
    'logout': 'Logout',
    
    // Navigation
    'home': 'Home',
    'messages': 'Messages',
    'unread_messages': 'Unread Messages',
    'chat_rooms': 'Chat Rooms',
    'your_chat_rooms': 'Your Chat Rooms',
    'join_conversations': 'Join conversations with others',
    'discover': 'Discover',
    'settings': 'Settings',
    'profile': 'Profile',
    'view_profile': 'View Profile',
    
    // Profile
    'edit_profile': 'Edit Profile',
    'html_profile': 'HTML Profile',
    'media': 'Media',
    'audio': 'Audio',
    'photos': 'Photos',
    'videos': 'Videos',
    'audio_player': 'Audio Player',
    'custom_html_profile': 'Custom HTML Profile',
    'media_gallery': 'Media Gallery',
    
    // Chat
    'chat': 'Chat',
    'no_chat_rooms_joined': 'No chat rooms joined yet',
    'browse_rooms': 'Browse Rooms',
    'view_all_rooms': 'View All Rooms',
    'send': 'Send',
    'new_message': 'New Message',
    'new_room': 'New Room',
    'room_name': 'Room Name',
    'room_description': 'Room Description',
    'create_room': 'Create Room',
    'join_room': 'Join Room',
    'leave_room': 'Leave Room',
    'private_room': 'Private Room',
    
    // Media
    'upload_media': 'Upload Media',
    'featured_audio': 'Featured Audio',
    'listen_to_shared_audio': 'Listen to shared audio tracks',
    'recent_shared_images': 'Recent shared images',
    'loading_media': 'Loading media',
    'no_images_shared': 'No images shared yet',
    'discover_more': 'Discover More',
    'share_media': 'Share Media',
    'title': 'Title',
    'description': 'Description',
    'file_upload': 'File Upload',
    'make_public': 'Make Public',
    'upload': 'Upload',
    'cancel': 'Cancel',
    'audio_tracks': 'Audio Tracks',
    'images': 'Images',
    
    // Match system
    'discover_people': 'Discover People',
    'likes': 'Likes',
    'matches': 'Matches',
    'like': 'Like',
    'skip': 'Skip',
    'its_a_match': 'It\'s a Match!',
    'no_more_profiles': 'No More Profiles',
    
    // Settings
    'account_settings': 'Account Settings',
    'appearance': 'Appearance',
    'language': 'Language',
    'theme': 'Theme',
    'privacy': 'Privacy',
    'notifications': 'Notifications',
    'dark_mode': 'Dark Mode',
    'light_mode': 'Light Mode',
    'system_theme': 'System Theme',
    'english': 'English',
    'russian': 'Russian',
    'save_settings': 'Save Settings',
    'change_password': 'Change Password',
    'current_password': 'Current Password',
    'new_password': 'New Password',
    'delete_account': 'Delete Account',
    
    // General
    'search': 'Search',
    'welcome': 'Welcome',
    'connect_description': 'Connect with friends and discover new communities',
    'dashboard_description': 'Your personalized SocialConnect dashboard',
    'no_results': 'No Results',
    'loading': 'Loading',
    'error': 'Error',
    'success': 'Success',
    'creating': 'Creating account',
    'create_account': 'Create Account',
    'save': 'Save',
    'edit': 'Edit',
    'delete': 'Delete',
    'view': 'View',
    'created_at': 'Created at',
    'updated_at': 'Updated at',
    'no_data': 'No data available',
    
    // Admin & Management
    'admin_panel': 'Admin Panel',
    'room_management': 'Room Management',
    'user_management': 'User Management',
    'ban_user': 'Ban User',
    'unban_user': 'Unban User',
    'user_banned': 'User Banned',
    'ban_reason': 'Ban Reason',
    'admin_logs': 'Admin Logs',
    'search_users': 'Search Users',
    'online': 'Online',
    'offline': 'Offline',
    'banned': 'Banned',
    'role': 'Role',
    'admin': 'Admin',
    'moderator': 'Moderator',
    'user': 'User',
    'members': 'Members',
    'manage_members': 'Manage Members',
    'remove_member': 'Remove Member',
    'update_role': 'Update Role',
    'invite_user': 'Invite User',
    'room_settings': 'Room Settings',
    'delete_room': 'Delete Room',
    'created_by': 'Created by',
    'action': 'Action',
    'target': 'Target',
    'details': 'Details',
    'verification_code': 'Verification Code',
    'verify_email': 'Verify Email',
    'code_sent': 'Code Sent',
    'enter_verification_code': 'Enter Verification Code',
    'verify': 'Verify',
    'resend_code': 'Resend Code',
  },
  ru: {
    // Auth
    'login': 'Вход',
    'register': 'Регистрация',
    'username': 'Имя пользователя',
    'password': 'Пароль',
    'confirm_password': 'Подтвердите пароль',
    'display_name': 'Отображаемое имя',
    'login_button': 'Войти',
    'register_button': 'Зарегистрироваться',
    'logout': 'Выйти',
    
    // Navigation
    'home': 'Главная',
    'messages': 'Сообщения',
    'unread_messages': 'Непрочитанные сообщения',
    'chat_rooms': 'Чат-комнаты',
    'your_chat_rooms': 'Ваши чат-комнаты',
    'join_conversations': 'Присоединяйтесь к беседам с другими',
    'discover': 'Обзор',
    'settings': 'Настройки',
    'profile': 'Профиль',
    'view_profile': 'Просмотр профиля',
    
    // Profile
    'edit_profile': 'Редактировать профиль',
    'html_profile': 'HTML-профиль',
    'media': 'Медиа',
    'audio': 'Аудио',
    'photos': 'Фото',
    'videos': 'Видео',
    'audio_player': 'Аудиоплеер',
    'custom_html_profile': 'Настраиваемый HTML-профиль',
    'media_gallery': 'Медиа-галерея',
    
    // Chat
    'chat': 'Чат',
    'no_chat_rooms_joined': 'Нет присоединенных чат-комнат',
    'browse_rooms': 'Просмотреть комнаты',
    'view_all_rooms': 'Просмотреть все комнаты',
    'send': 'Отправить',
    'new_message': 'Новое сообщение',
    'new_room': 'Новая комната',
    'room_name': 'Название комнаты',
    'room_description': 'Описание комнаты',
    'create_room': 'Создать комнату',
    'join_room': 'Присоединиться',
    'leave_room': 'Покинуть комнату',
    'private_room': 'Приватная комната',
    
    // Media
    'upload_media': 'Загрузить медиа',
    'featured_audio': 'Избранное аудио',
    'listen_to_shared_audio': 'Слушайте общие аудиотреки',
    'recent_shared_images': 'Недавно опубликованные изображения',
    'loading_media': 'Загрузка медиа',
    'no_images_shared': 'Нет опубликованных изображений',
    'discover_more': 'Открыть больше',
    'share_media': 'Опубликовать медиа',
    'title': 'Заголовок',
    'description': 'Описание',
    'file_upload': 'Загрузка файла',
    'make_public': 'Сделать публичным',
    'upload': 'Загрузить',
    'cancel': 'Отмена',
    'audio_tracks': 'Аудиотреки',
    'images': 'Изображения',
    
    // Match system
    'discover_people': 'Найти людей',
    'likes': 'Лайки',
    'matches': 'Совпадения',
    'like': 'Лайк',
    'skip': 'Пропустить',
    'its_a_match': 'Есть совпадение!',
    'no_more_profiles': 'Больше нет профилей',
    
    // Settings
    'account_settings': 'Настройки аккаунта',
    'appearance': 'Внешний вид',
    'language': 'Язык',
    'theme': 'Тема',
    'privacy': 'Конфиденциальность',
    'notifications': 'Уведомления',
    'dark_mode': 'Темная тема',
    'light_mode': 'Светлая тема',
    'system_theme': 'Системная тема',
    'english': 'Английский',
    'russian': 'Русский',
    'save_settings': 'Сохранить настройки',
    'change_password': 'Изменить пароль',
    'current_password': 'Текущий пароль',
    'new_password': 'Новый пароль',
    'delete_account': 'Удалить аккаунт',
    
    // General
    'search': 'Поиск',
    'welcome': 'Добро пожаловать',
    'connect_description': 'Общайтесь с друзьями и находите новые сообщества',
    'dashboard_description': 'Ваша персональная панель управления SocialConnect',
    'loading': 'Загрузка',
    'error': 'Ошибка',
    'success': 'Успех',
    'creating': 'Создание аккаунта',
    'create_account': 'Создать аккаунт',
    'save': 'Сохранить',
    'edit': 'Редактировать',
    'delete': 'Удалить',
    'view': 'Просмотр',
    'created_at': 'Создано',
    'updated_at': 'Обновлено',
    'no_data': 'Нет данных',
    'no_results': 'Нет результатов',
  },
};

// Хук для использования языкового контекста
export const useLanguage = () => useContext(LanguageContext);

// Провайдер компонента языкового контекста
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Устанавливаем начальный язык из localStorage или используем английский по умолчанию
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'en';
  });

  // Функция для перевода строк
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Сохраняем выбранный язык в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};