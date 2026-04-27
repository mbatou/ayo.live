// Hand-written until `supabase gen types typescript --project-id <id>` is wired up.
// Mirror the SQL schema in supabase/migrations/.

import type {
  EventStatus,
  PayoutStatus,
  TicketStatus,
  UserRole,
  WaitlistRole,
} from "./index";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          paystack_id?: string | null;
          stripe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
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
        };
        Insert: {
          id?: string;
          artist_id: string;
          title: string;
          description?: string | null;
          genre?: string | null;
          scheduled_at: string;
          ticket_price?: number;
          ticket_limit?: number | null;
          status?: EventStatus;
          cover_url?: string | null;
          mux_stream_id?: string | null;
          mux_stream_key?: string | null;
          mux_playback_id?: string | null;
          is_group?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      tickets: {
        Row: {
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
        };
        Insert: {
          id?: string;
          event_id: string;
          fan_id?: string | null;
          token?: string;
          device_fingerprint?: string | null;
          paystack_reference?: string | null;
          stripe_payment_id?: string | null;
          amount_paid: number;
          currency?: string;
          status?: TicketStatus;
          used_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          ticket_id: string;
          ip_hash: string | null;
          user_agent: string | null;
          last_seen: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          last_seen?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      payouts: {
        Row: {
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
        };
        Insert: {
          id?: string;
          artist_id: string;
          event_id?: string | null;
          gross_amount: number;
          platform_fee: number;
          net_amount: number;
          status?: PayoutStatus;
          paystack_transfer_id?: string | null;
          initiated_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payouts"]["Insert"]>;
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          role: WaitlistRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: WaitlistRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      payout_status: PayoutStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
