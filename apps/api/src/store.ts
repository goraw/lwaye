import {
  categories,
  favorites,
  listings,
  locations,
  messages,
  profiles,
  reports,
  threads,
  users
} from "@lwaye/shared";
import type {
  ChatThread,
  CreateListingRequest,
  CreateReportRequest,
  Favorite,
  FeedQuery,
  Listing,
  Message,
  Profile,
  Report,
  SendMessageRequest,
  StartThreadRequest,
  User,
  VerifyOtpRequest
} from "@lwaye/shared";

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

export class MarketplaceStore {
  private users = [...users];
  private profiles = [...profiles];
  private listings = [...listings];
  private favorites = [...favorites];
  private threads = [...threads];
  private messages = [...messages];
  private reports = [...reports];

  getBootstrap() {
    return {
      users: this.users,
      profiles: this.profiles,
      categories,
      locations
    };
  }

  startOtp(phone: string) {
    return {
      phone,
      code: "1234",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
  }

  verifyOtp(input: VerifyOtpRequest): User {
    const existing = this.users.find((user) => user.phone === input.phone);
    if (existing) {
      existing.verificationStatus = "verified";
      existing.isPhoneVerified = true;
      existing.displayName = input.displayName;
      existing.preferredLanguage = input.preferredLanguage;
      return existing;
    }

    const user: User = {
      id: createId("usr"),
      phone: input.phone,
      verificationStatus: "verified",
      displayName: input.displayName,
      preferredLanguage: input.preferredLanguage,
      profileType: "consumer",
      status: "active",
      isPhoneVerified: true
    };

    const profile: Profile = {
      userId: user.id,
      joinedAt: now(),
      meetupGuidanceAccepted: true
    };

    this.users.push(user);
    this.profiles.push(profile);
    return user;
  }

  listFeed(query: FeedQuery) {
    const limit = query.limit ?? 20;
    const filtered = this.listings
      .filter((listing) => listing.status === "active")
      .filter((listing) => !query.categoryId || listing.categoryId === query.categoryId)
      .filter((listing) => !query.locationId || listing.locationId === query.locationId)
      .filter((listing) => !query.minPrice || listing.priceETB >= query.minPrice)
      .filter((listing) => !query.maxPrice || listing.priceETB <= query.maxPrice)
      .filter((listing) => {
        if (!query.search) {
          return true;
        }
        const haystack = `${listing.title} ${listing.description}`.toLowerCase();
        return haystack.includes(query.search.toLowerCase());
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      items: filtered.slice(0, limit),
      nextCursor: filtered.length > limit ? filtered[limit - 1]?.id : undefined
    };
  }

  getListing(listingId: string) {
    return this.listings.find((listing) => listing.id === listingId);
  }

  createListing(input: CreateListingRequest): Listing {
    const timestamp = now();
    const listing: Listing = {
      id: createId("lst"),
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      priceETB: input.priceETB,
      negotiable: input.negotiable,
      categoryId: input.categoryId,
      condition: input.condition,
      locationId: input.locationId,
      photoUrls: input.photoUrls,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.listings.unshift(listing);
    return listing;
  }

  updateListingStatus(listingId: string, status: Listing["status"]) {
    const listing = this.getListing(listingId);
    if (!listing) {
      return undefined;
    }
    listing.status = status;
    listing.updatedAt = now();
    return listing;
  }

  listFavorites(userId: string) {
    return this.favorites.filter((favorite) => favorite.userId === userId);
  }

  toggleFavorite(userId: string, listingId: string): Favorite[] {
    const existing = this.favorites.find((favorite) => favorite.userId === userId && favorite.listingId === listingId);
    if (existing) {
      this.favorites = this.favorites.filter((favorite) => favorite.id !== existing.id);
      return this.listFavorites(userId);
    }
    this.favorites.push({
      id: createId("fav"),
      userId,
      listingId,
      createdAt: now()
    });
    return this.listFavorites(userId);
  }

  startThread(input: StartThreadRequest): ChatThread {
    const listing = this.getListing(input.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const existing = this.threads.find(
      (thread) => thread.listingId === input.listingId && thread.buyerId === input.buyerId
    );

    if (existing) {
      return existing;
    }

    const thread: ChatThread = {
      id: createId("thr"),
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      status: "active",
      lastMessageAt: now()
    };

    this.threads.push(thread);
    return thread;
  }

  listThreads(userId: string) {
    return this.threads.filter((thread) => thread.buyerId === userId || thread.sellerId === userId);
  }

  listMessages(threadId: string) {
    return this.messages
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  sendMessage(input: SendMessageRequest): Message {
    const thread = this.threads.find((entry) => entry.id === input.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }
    const message: Message = {
      id: createId("msg"),
      threadId: input.threadId,
      senderId: input.senderId,
      text: input.text,
      createdAt: now()
    };
    thread.lastMessageAt = message.createdAt;
    this.messages.push(message);
    return message;
  }

  createReport(input: CreateReportRequest): Report {
    const report: Report = {
      id: createId("rep"),
      status: "open",
      createdAt: now(),
      ...input
    };
    this.reports.push(report);
    return report;
  }

  listReports() {
    return [...this.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  resolveReport(reportId: string) {
    const report = this.reports.find((entry) => entry.id === reportId);
    if (!report) {
      return undefined;
    }
    report.status = "resolved";
    return report;
  }

  suspendUser(userId: string) {
    const user = this.users.find((entry) => entry.id === userId);
    if (!user) {
      return undefined;
    }
    user.status = "suspended";
    return user;
  }
}

export const store = new MarketplaceStore();
