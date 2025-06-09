import { User } from "@shared/schema";

type MessageHandler = (data: any) => void;
type ConnectionStatusHandler = (isConnected: boolean) => void;

// Define message types
export interface PrivateMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  mediaType: string;
  mediaUrl: string;
  read: boolean;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  content: string;
  mediaType: string;
  mediaUrl: string;
  createdAt: Date;
}

class SocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionStatusHandlers: Set<ConnectionStatusHandler> = new Set();
  private reconnectTimeout: number | null = null;
  private authenticated = false;
  private userId: number | null = null;

  init(userId: number) {
    this.userId = userId;
    this.connect();
  }

  private connect() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log("WebSocket connected");
        this.notifyConnectionStatus(true);
        
        // Authenticate with the server
        if (this.userId) {
          this.authenticate(this.userId);
        }
        
        // Clear any reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };
      
      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        this.notifyConnectionStatus(false);
        this.authenticated = false;
        
        // Try to reconnect after a delay
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          
          if (type === 'auth_success') {
            this.authenticated = true;
            console.log("WebSocket authenticated");
          }
          
          // Notify handlers for this message type
          this.notifyMessageHandlers(type, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
    }
  }
  
  private authenticate(userId: number) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'auth',
        userId
      }));
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
  
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  sendPrivateMessage(receiverId: number, content: string, mediaType = 'text', mediaUrl = '') {
    if (!this.isConnected() || !this.isAuthenticated()) {
      console.error("Cannot send message: WebSocket not connected or not authenticated");
      return false;
    }
    
    this.socket?.send(JSON.stringify({
      type: 'private_message',
      receiverId,
      content,
      mediaType,
      mediaUrl
    }));
    
    return true;
  }
  
  sendChatRoomMessage(roomId: number, content: string, mediaType = 'text', mediaUrl = '') {
    if (!this.isConnected() || !this.isAuthenticated()) {
      console.error("Cannot send chat message: WebSocket not connected or not authenticated");
      return false;
    }
    
    this.socket?.send(JSON.stringify({
      type: 'chat_message',
      roomId,
      content,
      mediaType,
      mediaUrl
    }));
    
    return true;
  }
  
  onMessage(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
    
    // Return an unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }
  
  onConnectionStatus(handler: ConnectionStatusHandler) {
    this.connectionStatusHandlers.add(handler);
    
    // Notify the new handler immediately of the current connection status
    handler(this.isConnected());
    
    // Return an unsubscribe function
    return () => {
      this.connectionStatusHandlers.delete(handler);
    };
  }
  
  private notifyMessageHandlers(type: string, data: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in message handler for type ${type}:`, error);
        }
      });
    }
  }
  
  private notifyConnectionStatus(isConnected: boolean) {
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (error) {
        console.error("Error in connection status handler:", error);
      }
    });
  }
}

// Create a singleton instance
export const socketClient = new SocketClient();

// Add hooks
export function useSocket(userId: number | null) {
  React.useEffect(() => {
    if (userId) {
      socketClient.init(userId);
      
      return () => {
        socketClient.disconnect();
      };
    }
  }, [userId]);
  
  return {
    isConnected: socketClient.isConnected(),
    isAuthenticated: socketClient.isAuthenticated(),
    sendPrivateMessage: socketClient.sendPrivateMessage.bind(socketClient),
    sendChatRoomMessage: socketClient.sendChatRoomMessage.bind(socketClient),
  };
}

// React import needed for the hook above
import React from 'react';
