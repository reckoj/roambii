export interface MessageType {
  $id: string;
  sender_id: string;
  receiver_id: string;
  room_id: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Package {
  $id: string;
  name: string;
  price: string;
  imageUrl: string | null;
}
