export type Event = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artistInitials: string;
  location: string;
  genre: string;
  date: string;
  time: string;
  price: number;
  ticketsSold: number;
  ticketsTotal: number;
  isLive: boolean;
  isGroup: boolean;
};

export type Artist = {
  id: string;
  name: string;
  initials: string;
  location: string;
};

export type WaitlistRole = "artist" | "fan";
