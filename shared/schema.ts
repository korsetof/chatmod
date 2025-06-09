import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio").default(""),
  profilePicture: text("profile_picture").default(""),
  profileHtml: text("profile_html").default(""),
  theme: text("theme").default("default"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  mediaType: text("media_type").default("text"), // text, image, audio, video
  mediaUrl: text("media_url").default(""),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  mediaType: true,
  mediaUrl: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Chat rooms schema
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  createdBy: integer("created_by").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).pick({
  name: true,
  description: true,
  createdBy: true,
  isPrivate: true,
});

export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;

// Chat room messages schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  mediaType: text("media_type").default("text"), // text, image, audio, video
  mediaUrl: text("media_url").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  roomId: true,
  userId: true,
  content: true,
  mediaType: true,
  mediaUrl: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Room memberships schema
export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomMemberSchema = createInsertSchema(roomMembers).pick({
  roomId: true,
  userId: true,
});

export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;
export type RoomMember = typeof roomMembers.$inferSelect;

// Media items schema (for audio player, etc.)
export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // audio, image, video
  url: text("url").notNull(),
  description: text("description").default(""),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).pick({
  userId: true,
  title: true,
  type: true,
  url: true,
  description: true,
  isPublic: true,
});

export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type MediaItem = typeof mediaItems.$inferSelect;

// Likes for matching system
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  likerId: integer("liker_id").notNull(),
  likedId: integer("liked_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  likerId: true,
  likedId: true,
});

export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;
