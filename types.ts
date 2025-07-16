
export interface TicketType {
  name: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
}

export interface TicketData {
  userId: string;
  eventName: string;
  attendeeName: string;
  ticketType: string;
  eventDate: string;
  ticketId: string;
  qrValue: string;
  qrGenerationTimestamp: number;
  price: number;
  transferCode?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  description:string;
  image: string;
}