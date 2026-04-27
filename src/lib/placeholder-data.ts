// Landing-page-only event shape. Real DB events use `Event` from `@/types`.
export type PlaceholderEvent = {
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

export const PLACEHOLDER_EVENTS: PlaceholderEvent[] = [
  {
    id: "1",
    slug: "eko-after-dark",
    title: "Eko After Dark",
    artist: "Asa Koroma",
    artistInitials: "AK",
    location: "Lagos, NG",
    genre: "Afrobeats",
    date: "SAT 16 MAY",
    time: "21:00 WAT",
    price: 8,
    ticketsSold: 412,
    ticketsTotal: 800,
    isLive: false,
    isGroup: true,
  },
  {
    id: "2",
    slug: "quiet-songs",
    title: "Quiet Songs for a Loud City",
    artist: "Wanjiku",
    artistInitials: "WJ",
    location: "Nairobi, KE",
    genre: "Soul",
    date: "SUN 17 MAY",
    time: "19:00 EAT",
    price: 6,
    ticketsSold: 188,
    ticketsTotal: 400,
    isLive: false,
    isGroup: false,
  },
  {
    id: "3",
    slug: "light-of-kejetia",
    title: "The Light of Kejetia",
    artist: "Kojo Frame",
    artistInitials: "KF",
    location: "Kumasi, GH",
    genre: "Talk",
    date: "WED 20 MAY",
    time: "18:00 GMT",
    price: 4,
    ticketsSold: 96,
    ticketsTotal: 300,
    isLive: false,
    isGroup: false,
  },
  {
    id: "4",
    slug: "imole-ep-launch",
    title: "Ìmọ́lọ́ẹ̀ — EP Launch",
    artist: "Ṣadé Òrún",
    artistInitials: "SO",
    location: "Ibadan, NG",
    genre: "Yoruba Pop",
    date: "SAT 23 MAY",
    time: "21:30 WAT",
    price: 12,
    ticketsSold: 612,
    ticketsTotal: 1500,
    isLive: false,
    isGroup: true,
  },
  {
    id: "5",
    slug: "pwani-dubplate",
    title: "Pwani Dubplate",
    artist: "Amani Dub",
    artistInitials: "AD",
    location: "Mombasa, KE",
    genre: "Dub",
    date: "FRI 15 MAY",
    time: "18:30 EAT",
    price: 7,
    ticketsSold: 248,
    ticketsTotal: 600,
    isLive: false,
    isGroup: true,
  },
  {
    id: "6",
    slug: "odo-ne-asomdwoee",
    title: "Ɔdɔ Ne Asomdwoeɛ",
    artist: "Nkyinkyim Collective",
    artistInitials: "NK",
    location: "Accra, GH",
    genre: "Highlife",
    date: "FRI 22 MAY",
    time: "20:30 GMT",
    price: 10,
    ticketsSold: 1284,
    ticketsTotal: 2000,
    isLive: true,
    isGroup: true,
  },
];

export const FEATURED_EVENT = PLACEHOLDER_EVENTS[5];

export const GENRE_TINTS: Record<string, string> = {
  Afrobeats: "#1a0f00",
  Highlife: "#0d1a00",
  Soul: "#0a0a1a",
  Dub: "#001a1a",
  "Yoruba Pop": "#1a001a",
  Talk: "#001a0d",
  default: "#111111",
};

export const GENRES = [
  "All",
  "Afrobeats",
  "Highlife",
  "Soul",
  "Dub",
  "Spoken Word",
  "Yoruba Pop",
  "Talk",
];
