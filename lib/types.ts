export interface MessageType {
  [x: string]: any;
  $id: string;
  room_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  timestamp: string;
}

export interface ChatRoom {
  $id: string;
  room_id: string;
  user_id: string;
  agent_id: string;
  user_name?: string;
  agent_name?: string;
  name?: string;
  last_message?: string;
  last_updated: string;
  unread_count: number;
}

export interface User {
  $id: string;
  name?: string;
  email?: string;
  profile_image?: string;
  // Add other user properties as needed
}
