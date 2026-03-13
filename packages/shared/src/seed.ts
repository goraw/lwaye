import type { Category, ChatThread, Favorite, Listing, Location, Message, Profile, Report, User } from "./types";

export const categories: Category[] = [
  { id: "cat-electronics", slug: "electronics", label: { am: "????????", en: "Electronics" } },
  { id: "cat-phones", slug: "phones", label: { am: "????", en: "Phones" } },
  { id: "cat-home", slug: "home-goods", label: { am: "??? ????", en: "Home Goods" } },
  { id: "cat-fashion", slug: "fashion", label: { am: "???", en: "Fashion" } },
  { id: "cat-baby", slug: "baby-items", label: { am: "????? ????", en: "Baby Items" } }
];

export const locations: Location[] = [
  { id: "loc-bole", city: "Addis Ababa", subcity: "Bole", areaLabel: { am: "??", en: "Bole" } },
  { id: "loc-kirkos", city: "Addis Ababa", subcity: "Kirkos", areaLabel: { am: "????", en: "Kirkos" } },
  { id: "loc-yeka", city: "Addis Ababa", subcity: "Yeka", areaLabel: { am: "??", en: "Yeka" } },
  { id: "loc-arada", city: "Addis Ababa", subcity: "Arada", areaLabel: { am: "???", en: "Arada" } }
];

export const users: User[] = [
  {
    id: "usr-admin-1",
    phone: "+251900000001",
    verificationStatus: "verified",
    displayName: "LwayLway Admin",
    preferredLanguage: "en",
    profileType: "consumer",
    status: "active",
    isPhoneVerified: true,
    isAdmin: true
  },
  {
    id: "usr-seller-1",
    phone: "+251911000111",
    verificationStatus: "verified",
    displayName: "Marta Tech",
    preferredLanguage: "en",
    profileType: "small_business",
    status: "active",
    isPhoneVerified: true,
    isAdmin: false
  },
  {
    id: "usr-buyer-1",
    phone: "+251912000222",
    verificationStatus: "verified",
    displayName: "Dawit",
    preferredLanguage: "am",
    profileType: "consumer",
    status: "active",
    isPhoneVerified: true,
    isAdmin: false
  }
];

export const profiles: Profile[] = [
  {
    userId: "usr-admin-1",
    bio: "Marketplace moderation and launch operations.",
    joinedAt: "2026-03-01T08:00:00.000Z",
    meetupGuidanceAccepted: true
  },
  {
    userId: "usr-seller-1",
    businessName: "Marta Mobile Accessories",
    bio: "Trusted phone accessories seller in Bole.",
    joinedAt: "2026-03-01T09:00:00.000Z",
    meetupGuidanceAccepted: true
  },
  {
    userId: "usr-buyer-1",
    bio: "Looking for reliable electronics in Addis.",
    joinedAt: "2026-03-02T09:00:00.000Z",
    meetupGuidanceAccepted: true
  }
];

export const listings: Listing[] = [
  {
    id: "lst-1",
    sellerId: "usr-seller-1",
    title: "iPhone 13 Pro 256GB",
    description: "Clean condition, battery health 88%, meetup in Bole.",
    priceETB: 98000,
    negotiable: true,
    categoryId: "cat-phones",
    condition: "good",
    locationId: "loc-bole",
    photoUrls: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"
    ],
    status: "active",
    createdAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-03-05T09:00:00.000Z"
  },
  {
    id: "lst-2",
    sellerId: "usr-seller-1",
    title: "Modern coffee table",
    description: "Solid wood table, lightly used, pickup near Kirkos.",
    priceETB: 14500,
    negotiable: false,
    categoryId: "cat-home",
    condition: "like_new",
    locationId: "loc-kirkos",
    photoUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
    ],
    status: "active",
    createdAt: "2026-03-04T09:00:00.000Z",
    updatedAt: "2026-03-04T09:00:00.000Z"
  }
];

export const favorites: Favorite[] = [
  {
    id: "fav-1",
    listingId: "lst-1",
    userId: "usr-buyer-1",
    createdAt: "2026-03-05T12:00:00.000Z"
  }
];

export const threads: ChatThread[] = [
  {
    id: "thr-1",
    listingId: "lst-1",
    buyerId: "usr-buyer-1",
    sellerId: "usr-seller-1",
    status: "active",
    lastMessageAt: "2026-03-05T12:20:00.000Z"
  }
];

export const messages: Message[] = [
  {
    id: "msg-1",
    threadId: "thr-1",
    senderId: "usr-buyer-1",
    text: "Is this still available?",
    createdAt: "2026-03-05T12:15:00.000Z"
  },
  {
    id: "msg-2",
    threadId: "thr-1",
    senderId: "usr-seller-1",
    text: "Yes, available. We can meet in Bole.",
    createdAt: "2026-03-05T12:20:00.000Z"
  }
];

export const reports: Report[] = [];

