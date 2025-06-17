export interface Message {
  id: number;
  content: string;
  createdAt: Date | null;
  senderId: number;
  receiverId: number;
  mediaType: string | null;
  mediaUrl: string | null;
  read: boolean | null;
}

export interface RoomMember {
  id: number;
  role: string | null;
  createdAt: Date | null;
  roomId: number;
  userId: number;
  joinedAt: Date | null;
}

export interface ChatMessage {
  id: number;
  content: string;
  createdAt: Date | null;
  mediaType: string | null;
  mediaUrl: string | null;
  roomId: number;
  userId: number;
}

export interface VerificationCode {
  code: string;
  type: string;
  id: number;
  email: string;
  createdAt: Date | null;
  expiresAt: Date;
  used: boolean | null;
}

export interface AdminAction {
  id: number;
  action: string;
  createdAt: Date | null;
  adminId: number;
  targetType: string;
  targetId: number;
  details: unknown;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]; 