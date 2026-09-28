# Руководство по развертыванию

> В этом документе намеренно не хранятся реальные IP-адреса, логины, пароли, SSH-ключи или другие production-секреты.

## Требования
- Node.js 18+ на сервере
- PM2 (`npm install -g pm2`)
- SSH-доступ к серверу
- FTP/SFTP-доступ к хостингу

## Развертывание бэкенда
1. Подключитесь к серверу:

    ssh USER@SERVER

2. Создайте директорию приложения:

    mkdir -p /var/www/chatmod

3. Загрузите файлы:

    scp -r deploy/backend/* USER@SERVER:/var/www/chatmod/

4. Установите зависимости и запустите приложение:

    cd /var/www/chatmod
    npm install --production
    pm2 start ecosystem.config.js
    pm2 save

## Развертывание фронтенда
Загрузите production-сборку в директорию хостинга, например `public_html`.

Веб-сервер должен:
- отдавать `index.html` для клиентских маршрутов;
- использовать HTTPS;
- разрешать только необходимые CORS origins;
- не публиковать `.env` и служебные файлы.

## Переменные окружения
Создайте `.env` на сервере:

    NODE_ENV=production
    PORT=3000
    DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
    SESSION_SECRET=replace-with-a-long-random-secret

Не коммитьте production `.env` в Git.

## Мониторинг

    pm2 monit
    pm2 logs
    pm2 status

Перезапуск:

    pm2 restart backend

## Безопасность
Если реальные credentials или инфраструктурные данные когда-либо были опубликованы в Git, их следует считать скомпрометированными: замените credentials и при необходимости очистите историю репозитория.

Перед production-деплоем проверьте:
- секреты хранятся только в environment variables;
- HTTPS включён;
- SSH использует безопасную аутентификацию;
- доступ к PostgreSQL ограничен;
- резервное копирование настроено;
- логи не содержат токены и пароли.