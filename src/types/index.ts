export type UserRole = "artist" | "fan" | "admin";
export type EventStatus =
  | "draft"
  | "published"
  | "live"
  | "ended"
  | "cancelled";
export type PayoutStatus = "pending" | "processing" | "paid" | "failed";
export type TicketStatus = "pending" | "confirmed" | "refunded";
export type WaitlistRole = "artist" | "fan";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  paystack_id: string | null;
  stripe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  genre: string | null;
  scheduled_at: string;
  ticket_price: number;
  ticket_limit: number | null;
  status: EventStatus;
  cover_url: string | null;
  mux_stream_id: string | null;
  mux_stream_key: string | null;
  mux_playback_id: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Ticket {
  id: string;
  event_id: string;
  fan_id: string | null;
  token: string;
  device_fingerprint: string | null;
  paystack_reference: string | null;
  stripe_payment_id: string | null;
  amount_paid: number;
  currency: string;
  status: TicketStatus;
  used_at: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  ticket_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  last_seen: string;
  created_at: string;
}

export interface Payout {
  id: string;
  artist_id: string;
  event_id: string | null;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: PayoutStatus;
  paystack_transfer_id: string | null;
  initiated_at: string | null;
  completed_at: string | null;
  created_at: string;
}
