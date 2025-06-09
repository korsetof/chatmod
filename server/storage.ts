import { 
  users, type User, type InsertUser,
  messages, type Message, type InsertMessage,
  chatRooms, type ChatRoom, type InsertChatRoom,
  chatMessages, type ChatMessage, type InsertChatMessage,
  roomMembers, type RoomMember, type InsertRoomMember,
  mediaItems, type MediaItem, type InsertMediaItem,
  likes, type Like, type InsertLike
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  markMessagesAsRead(userId: number, otherUserId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Chat room operations
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoomById(id: number): Promise<ChatRoom | undefined>;
  getChatRoomsForUser(userId: number): Promise<ChatRoom[]>;
  
  // Chat message operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByRoomId(roomId: number): Promise<ChatMessage[]>;
  
  // Room member operations
  addUserToRoom(member: InsertRoomMember): Promise<RoomMember>;
  removeUserFromRoom(roomId: number, userId: number): Promise<void>;
  getRoomMembers(roomId: number): Promise<User[]>;
  
  // Media operations
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  getMediaItemsByUserId(userId: number): Promise<MediaItem[]>;
  getPublicMediaItems(): Promise<MediaItem[]>;
  getMediaItemById(id: number): Promise<MediaItem | undefined>;
  
  // Like/Match operations
  createLike(like: InsertLike): Promise<Like>;
  getLikesBetweenUsers(user1Id: number, user2Id: number): Promise<Like[]>;
  getLikesByUser(userId: number): Promise<Like[]>;
  getMatches(userId: number): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private chatRooms: Map<number, ChatRoom>;
  private chatMessages: Map<number, ChatMessage>;
  private roomMembers: Map<number, RoomMember>;
  private mediaItems: Map<number, MediaItem>;
  private likes: Map<number, Like>;
  
  currentUserId: number;
  currentMessageId: number;
  currentChatRoomId: number;
  currentChatMessageId: number;
  currentRoomMemberId: number;
  currentMediaItemId: number;
  currentLikeId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.chatRooms = new Map();
    this.chatMessages = new Map();
    this.roomMembers = new Map();
    this.mediaItems = new Map();
    this.likes = new Map();
    
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentChatRoomId = 1;
    this.currentChatMessageId = 1;
    this.currentRoomMemberId = 1;
    this.currentMediaItemId = 1;
    this.currentLikeId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }
  
  private initializeData() {
    // Create a few initial chat rooms
    this.createChatRoom({
      name: "General Discussion",
      description: "A place to talk about anything",
      createdBy: 0,
      isPrivate: false
    });
    
    this.createChatRoom({
      name: "Music Lovers",
      description: "Share and discuss your favorite music",
      createdBy: 0,
      isPrivate: false
    });
    
    this.createChatRoom({
      name: "Photography",
      description: "For photography enthusiasts",
      createdBy: 0,
      isPrivate: false
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      bio: "",
      profilePicture: "",
      profileHtml: "",
      theme: "default",
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserProfile(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const now = new Date();
    const newMessage: Message = { ...message, id, read: false, createdAt: now };
    this.messages.set(id, newMessage);
    return newMessage;
  }
  
  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => 
        (message.senderId === user1Id && message.receiverId === user2Id) ||
        (message.senderId === user2Id && message.receiverId === user1Id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async markMessagesAsRead(userId: number, otherUserId: number): Promise<void> {
    for (const [id, message] of this.messages.entries()) {
      if (message.receiverId === userId && message.senderId === otherUserId) {
        this.messages.set(id, { ...message, read: true });
      }
    }
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messages.values()).filter(
      (message) => message.receiverId === userId && !message.read
    ).length;
  }
  
  // Chat room operations
  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const id = this.currentChatRoomId++;
    const now = new Date();
    const newRoom: ChatRoom = { ...room, id, createdAt: now };
    this.chatRooms.set(id, newRoom);
    
    // Add creator as a member if this is a user-created room
    if (room.createdBy > 0) {
      await this.addUserToRoom({ roomId: id, userId: room.createdBy });
    }
    
    return newRoom;
  }
  
  async getChatRooms(): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values());
  }
  
  async getChatRoomById(id: number): Promise<ChatRoom | undefined> {
    return this.chatRooms.get(id);
  }
  
  async getChatRoomsForUser(userId: number): Promise<ChatRoom[]> {
    const userRoomIds = Array.from(this.roomMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.roomId);
    
    return Array.from(this.chatRooms.values())
      .filter(room => userRoomIds.includes(room.id) || !room.isPrivate);
  }
  
  // Chat message operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const now = new Date();
    const newMessage: ChatMessage = { ...message, id, createdAt: now };
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }
  
  async getChatMessagesByRoomId(roomId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  // Room member operations
  async addUserToRoom(member: InsertRoomMember): Promise<RoomMember> {
    const id = this.currentRoomMemberId++;
    const now = new Date();
    const newMember: RoomMember = { ...member, id, createdAt: now };
    this.roomMembers.set(id, newMember);
    return newMember;
  }
  
  async removeUserFromRoom(roomId: number, userId: number): Promise<void> {
    for (const [id, member] of this.roomMembers.entries()) {
      if (member.roomId === roomId && member.userId === userId) {
        this.roomMembers.delete(id);
        break;
      }
    }
  }
  
  async getRoomMembers(roomId: number): Promise<User[]> {
    const memberIds = Array.from(this.roomMembers.values())
      .filter(member => member.roomId === roomId)
      .map(member => member.userId);
    
    return Array.from(this.users.values())
      .filter(user => memberIds.includes(user.id));
  }
  
  // Media operations
  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const id = this.currentMediaItemId++;
    const now = new Date();
    const newItem: MediaItem = { ...item, id, createdAt: now };
    this.mediaItems.set(id, newItem);
    return newItem;
  }
  
  async getMediaItemsByUserId(userId: number): Promise<MediaItem[]> {
    return Array.from(this.mediaItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getPublicMediaItems(): Promise<MediaItem[]> {
    return Array.from(this.mediaItems.values())
      .filter(item => item.isPublic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getMediaItemById(id: number): Promise<MediaItem | undefined> {
    return this.mediaItems.get(id);
  }
  
  // Like/Match operations
  async createLike(like: InsertLike): Promise<Like> {
    // Check if this like already exists
    const existingLike = Array.from(this.likes.values()).find(
      l => l.likerId === like.likerId && l.likedId === like.likedId
    );
    
    if (existingLike) {
      return existingLike;
    }
    
    const id = this.currentLikeId++;
    const now = new Date();
    const newLike: Like = { ...like, id, createdAt: now };
    this.likes.set(id, newLike);
    return newLike;
  }
  
  async getLikesBetweenUsers(user1Id: number, user2Id: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(
      (like) => 
        (like.likerId === user1Id && like.likedId === user2Id) ||
        (like.likerId === user2Id && like.likedId === user1Id)
    );
  }
  
  async getLikesByUser(userId: number): Promise<Like[]> {
    return Array.from(this.likes.values()).filter(
      (like) => like.likerId === userId
    );
  }
  
  async getMatches(userId: number): Promise<User[]> {
    // Get users who user has liked
    const likedUserIds = Array.from(this.likes.values())
      .filter(like => like.likerId === userId)
      .map(like => like.likedId);
    
    // Get users who have liked this user
    const likedByUserIds = Array.from(this.likes.values())
      .filter(like => like.likedId === userId)
      .map(like => like.likerId);
    
    // Find mutual likes (matches)
    const matchUserIds = likedUserIds.filter(id => likedByUserIds.includes(id));
    
    return Array.from(this.users.values())
      .filter(user => matchUserIds.includes(user.id));
  }
}

export const storage = new MemStorage();
