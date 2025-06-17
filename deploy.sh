#!/bin/bash

# Сборка фронтенда
echo "Сборка фронтенда..."
npm run build

# Сборка бэкенда
echo "Сборка бэкенда..."
npm run build

# Создание директорий для развертывания
echo "Создание директорий для развертывания..."
mkdir -p deploy/frontend
mkdir -p deploy/backend

# Копирование сборки фронтенда в директорию развертывания
echo "Копирование сборки фронтенда..."
cp -r dist/* deploy/frontend/

# Копирование сборки бэкенда в директорию развертывания
echo "Копирование сборки бэкенда..."
cp -r dist/index.js deploy/backend/
cp package.json deploy/backend/
cp package-lock.json deploy/backend/

# Создание файла конфигурации PM2
echo "Создание файла конфигурации PM2..."
cat > deploy/backend/ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "backend",
    script: "index.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
EOL

echo "Файлы для развертывания подготовлены в директории deploy" 