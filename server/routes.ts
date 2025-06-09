import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertChatRoomSchema, insertChatMessageSchema, insertRoomMemberSchema, insertMediaItemSchema, insertLikeSchema, insertVerificationCodeSchema } from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { sendVerificationEmail, generateVerificationCode, getMimeTypeFromExtension, getMediaTypeFromMime } from "./email";

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const profilePicsDir = path.join(uploadDir, 'profile-pics');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

const mediaUploadsDir = path.join(uploadDir, 'media');
if (!fs.existsSync(mediaUploadsDir)) {
  fs.mkdirSync(mediaUploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = mediaUploadsDir;
    if (req.path.includes('profile-picture')) {
      dest = profilePicsDir;
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with their user IDs
  const clients = new Map<number, WebSocket[]>();
  
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          userId = data.userId;
          
          // Store client connection
          if (!clients.has(userId)) {
            clients.set(userId, []);
          }
          clients.get(userId)?.push(ws);
          
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
        
        // Handle different message types
        if (data.type === 'private_message' && userId) {
          const receiverConnections = clients.get(data.receiverId) || [];
          
          // Save message to database
          const message = await storage.createMessage({
            senderId: userId,
            receiverId: data.receiverId,
            content: data.content,
            mediaType: data.mediaType || 'text',
            mediaUrl: data.mediaUrl || '',
          });
          
          // Send message to recipient if online
          receiverConnections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'private_message',
                message
              }));
            }
          });
        }
        
        // Handle chat room messages
        if (data.type === 'chat_message' && userId) {
          // Save message to database
          const chatMessage = await storage.createChatMessage({
            roomId: data.roomId,
            userId: userId,
            content: data.content,
            mediaType: data.mediaType || 'text',
            mediaUrl: data.mediaUrl || '',
          });
          
          // Get room members to broadcast message
          const roomMembers = await storage.getRoomMembers(data.roomId);
          
          // Broadcast message to all room members
          roomMembers.forEach(member => {
            const memberConnections = clients.get(member.id) || [];
            memberConnections.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'chat_message',
                  message: chatMessage
                }));
              }
            });
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        const userConnections = clients.get(userId) || [];
        clients.set(userId, userConnections.filter(conn => conn !== ws));
      }
    });
  });
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  // User routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user' });
    }
  });
  
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get users' });
    }
  });
  
  app.patch('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Don't allow updating username or password through this endpoint
      delete userData.username;
      delete userData.password;
      
      const updatedUser = await storage.updateUserProfile(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  app.post('/api/users/:id/profile-picture', upload.single('image'), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const profilePicture = `/uploads/profile-pics/${req.file.filename}`;
      
      const updatedUser = await storage.updateUserProfile(userId, { profilePicture });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  });
  
  // Message routes
  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      const message = await storage.createMessage(messageData);
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create message' });
    }
  });
  
  app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const otherUserId = parseInt(req.params.otherUserId);
      
      const messages = await storage.getMessagesBetweenUsers(userId, otherUserId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(userId, otherUserId);
      
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });
  
  app.get('/api/messages/unread-count/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const count = await storage.getUnreadMessageCount(userId);
      
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get unread message count' });
    }
  });
  
  // Chat room routes
  app.post('/api/chat-rooms', async (req, res) => {
    try {
      const roomData = insertChatRoomSchema.parse(req.body);
      
      const room = await storage.createChatRoom(roomData);
      
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat room data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create chat room' });
    }
  });
  
  app.get('/api/chat-rooms', async (req, res) => {
    try {
      const rooms = await storage.getChatRooms();
      
      res.status(200).json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get chat rooms' });
    }
  });
  
  app.get('/api/chat-rooms/:id', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      
      const room = await storage.getChatRoomById(roomId);
      
      if (!room) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      
      res.status(200).json(room);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get chat room' });
    }
  });
  
  app.get('/api/chat-rooms/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const rooms = await storage.getChatRoomsForUser(userId);
      
      res.status(200).json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get chat rooms for user' });
    }
  });
  
  // Chat message routes
  app.post('/api/chat-messages', async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      
      const message = await storage.createChatMessage(messageData);
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat message data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create chat message' });
    }
  });
  
  app.get('/api/chat-messages/:roomId', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      
      const messages = await storage.getChatMessagesByRoomId(roomId);
      
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get chat messages' });
    }
  });
  
  // Room member routes
  app.post('/api/room-members', async (req, res) => {
    try {
      const memberData = insertRoomMemberSchema.parse(req.body);
      
      const member = await storage.addUserToRoom(memberData);
      
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid room member data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to add room member' });
    }
  });
  
  app.delete('/api/room-members/:roomId/:userId', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const userId = parseInt(req.params.userId);
      
      await storage.removeUserFromRoom(roomId, userId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove room member' });
    }
  });
  
  app.get('/api/room-members/:roomId', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      
      const members = await storage.getRoomMembers(roomId);
      
      // Remove passwords from response
      const membersWithoutPasswords = members.map(member => {
        const { password, ...memberWithoutPassword } = member;
        return memberWithoutPassword;
      });
      
      res.status(200).json(membersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get room members' });
    }
  });
  
  // Media routes
  app.post('/api/media', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const { userId, title, type, description, isPublic } = req.body;
      
      if (!userId || !title || !type) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const mediaUrl = `/uploads/media/${req.file.filename}`;
      
      const mediaItem = await storage.createMediaItem({
        userId: parseInt(userId),
        title,
        type,
        url: mediaUrl,
        description: description || '',
        isPublic: isPublic === 'true',
      });
      
      res.status(201).json(mediaItem);
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload media' });
    }
  });
  
  app.get('/api/media/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const mediaItems = await storage.getMediaItemsByUserId(userId);
      
      res.status(200).json(mediaItems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get media items' });
    }
  });
  
  app.get('/api/media/public', async (req, res) => {
    try {
      const mediaItems = await storage.getPublicMediaItems();
      
      res.status(200).json(mediaItems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get public media items' });
    }
  });
  
  app.get('/api/media/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const mediaItem = await storage.getMediaItemById(id);
      
      if (!mediaItem) {
        return res.status(404).json({ message: 'Media item not found' });
      }
      
      res.status(200).json(mediaItem);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get media item' });
    }
  });
  
  // Like/Match routes
  app.post('/api/likes', async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      
      const like = await storage.createLike(likeData);
      
      // Check if this created a match
      const likes = await storage.getLikesBetweenUsers(likeData.likerId, likeData.likedId);
      const isMatch = likes.length === 2;
      
      res.status(201).json({ like, isMatch });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid like data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create like' });
    }
  });
  
  app.get('/api/likes/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const likes = await storage.getLikesByUser(userId);
      
      res.status(200).json(likes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get likes' });
    }
  });
  
  app.get('/api/matches/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const matches = await storage.getMatches(userId);
      
      // Remove passwords from response
      const matchesWithoutPasswords = matches.map(match => {
        const { password, ...matchWithoutPassword } = match;
        return matchWithoutPassword;
      });
      
      res.status(200).json(matchesWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get matches' });
    }
  });

  return httpServer;
}
