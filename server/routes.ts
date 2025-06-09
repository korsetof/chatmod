import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertChatRoomSchema, insertChatMessageSchema, insertRoomMemberSchema, insertMediaItemSchema, insertLikeSchema, insertVerificationCodeSchema } from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import multer, { type Multer } from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { sendVerificationEmail, generateVerificationCode, getMimeTypeFromExtension, getMediaTypeFromMime } from "./email";

// Extend Express Request type to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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
    
    ws.on('message', (message) => {
      (async () => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle authentication
          if (data.type === 'auth' && typeof data.userId === 'number') {
            userId = data.userId;
            
            // Store client connection
            if (!clients.has(userId)) {
              clients.set(userId, []);
            }
            clients.get(userId)!.push(ws);
            
            ws.send(JSON.stringify({ type: 'auth_success' }));
          }
          
          // Handle different message types
          if (data.type === 'private_message' && userId !== null) {
            const receiverConnections = clients.get(data.receiverId) || [];
            
            // Save message to database
            const messageData = await storage.createMessage({
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
                  message: messageData
                }));
              }
            });
          }
          
          // Handle chat room messages
          if (data.type === 'chat_message' && userId !== null) {
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
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to process message' 
            }));
          }
        }
      })().catch(error => {
        console.error('Unhandled WebSocket async error:', error);
      });
    });
    
    ws.on('close', () => {
      if (userId) {
        const userConnections = clients.get(userId) || [];
        clients.set(userId, userConnections.filter(conn => conn !== ws));
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
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
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create user with emailVerified: false
      const user = await storage.createUser({
        ...userData,
        emailVerified: false
      });
      
      // Send verification email
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await storage.createVerificationCode({
        email: userData.email,
        code,
        type: 'registration',
        expiresAt
      });
      
      await sendVerificationEmail(userData.email, code);
      
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
  
  app.post('/api/users/:id/profile-picture', upload.single('image'), async (req: MulterRequest, res) => {
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
  app.post('/api/media', upload.single('file'), async (req: MulterRequest, res) => {
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

  // New enhanced API routes

  // User search by username (with @ support)
  app.get('/api/users/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: 'Query parameter required' });
      }
      
      const users = await storage.searchUsersByUsername(query);
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  // Update user online status
  app.patch('/api/users/:userId/online-status', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isOnline } = req.body;
      
      await storage.updateUserOnlineStatus(userId, isOnline);
      
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update online status' });
    }
  });

  // Email verification routes
  app.post('/api/auth/send-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.emailVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }
      
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await storage.createVerificationCode({
        email,
        code,
        type: 'registration',
        expiresAt
      });
      
      const emailSent = await sendVerificationEmail(email, code);
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
      
      res.status(200).json({ message: 'Verification code sent' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: 'Email and code are required' });
      }
      
      const verificationCode = await storage.getVerificationCode(email, code, 'registration');
      
      if (!verificationCode) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
      
      // Mark code as used
      await storage.markVerificationCodeAsUsed(verificationCode.id);
      
      // Update user email verification status
      const user = await storage.getUserByEmail(email);
      if (user) {
        await storage.updateUserProfile(user.id, { emailVerified: true });
      }
      
      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to verify email' });
    }
  });

  // Admin routes
  app.get('/api/admin/logs', async (req, res) => {
    try {
      // Check if user is admin (in real app, verify JWT token)
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getAdminLogs(limit);
      
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get admin logs' });
    }
  });

  app.post('/api/admin/ban-user', async (req, res) => {
    try {
      const { userId, adminId, reason } = req.body;
      
      if (!userId || !adminId || !reason) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      await storage.banUser(userId, adminId, reason);
      
      res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  app.post('/api/admin/unban-user', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      await storage.unbanUser(userId);
      
      res.status(200).json({ message: 'User unbanned successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unban user' });
    }
  });

  // Room management routes
  app.delete('/api/chat-rooms/:roomId', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      
      await storage.deleteChatRoom(roomId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  app.patch('/api/chat-rooms/:roomId', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const updates = req.body;
      
      const updatedRoom = await storage.updateChatRoom(roomId, updates);
      
      if (!updatedRoom) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      res.status(200).json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update room' });
    }
  });

  // Room member role management
  app.patch('/api/room-members/:roomId/:userId/role', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: 'Role is required' });
      }
      
      await storage.updateRoomMemberRole(roomId, userId, role);
      
      res.status(200).json({ message: 'Role updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  app.get('/api/room-members/:roomId/:userId/role', async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const userId = parseInt(req.params.userId);
      
      const role = await storage.getRoomMemberRole(roomId, userId);
      
      if (!role) {
        return res.status(404).json({ message: 'Member not found in room' });
      }
      
      res.status(200).json({ role });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get member role' });
    }
  });

  // File type detection route
  app.post('/api/detect-file-type', upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const mimeType = getMimeTypeFromExtension(req.file.originalname);
      const mediaType = getMediaTypeFromMime(mimeType);
      
      res.status(200).json({
        filename: req.file.originalname,
        mimeType,
        mediaType,
        size: req.file.size
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to detect file type' });
    }
  });

  return httpServer;
}
