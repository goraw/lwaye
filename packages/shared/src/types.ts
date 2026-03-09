export type Language = "am" | "en";

export type ProfileType = "consumer" | "small_business";
export type UserStatus = "active" | "suspended";
export type VerificationStatus = "pending" | "verified";
export type ListingStatus = "draft" | "active" | "sold" | "hidden" | "flagged";
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "used";
export type ThreadStatus = "active" | "blocked" | "closed";
export type ReportTargetType = "listing" | "user" | "message";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ModerationActionType = "approve_listing" | "hide_listing" | "suspend_user" | "warn_user" | "resolve_report";

export interface LocalizedText {
  am: string;
  en: string;
}

export interface User {
  id: string;
  phone: string;
  verificationStatus: VerificationStatus;
  displayName: string;
  preferredLanguage: Language;
  profileType: ProfileType;
  status: UserStatus;
  isPhoneVerified: boolean;
  isAdmin: boolean;
}

export interface Profile {
  userId: string;
  bio?: string;
  businessName?: string;
  avatarUrl?: string;
  joinedAt: string;
  meetupGuidanceAccepted: boolean;
}

export interface Category {
  id: string;
  slug: string;
  label: LocalizedText;
}

export interface Location {
  id: string;
  city: string;
  subcity: string;
  areaLabel: LocalizedText;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceETB: number;
  negotiable: boolean;
  categoryId: string;
  condition: ListingCondition;
  locationId: string;
  photoUrls: string[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  listingId: string;
  userId: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: ThreadStatus;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string;
}

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reasonCode: string;
  notes?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface ModerationAction {
  id: string;
  adminId: string;
  actionType: ModerationActionType;
  targetId: string;
  notes?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface FeedQuery {
  search?: string;
  categoryId?: string;
  locationId?: string;
  minPrice?: number;
  maxPrice?: number;
  cursor?: string;
  limit?: number;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  preferredLanguage: Language;
  displayName: string;
}

export interface CreateListingRequest {
  sellerId: string;
  title: string;
  description: string;
  priceETB: number;
  negotiable: boolean;
  categoryId: string;
  condition: ListingCondition;
  locationId: string;
  photoUrls: string[];
}

export interface StartThreadRequest {
  listingId: string;
  buyerId: string;
}

export interface SendMessageRequest {
  threadId: string;
  senderId: string;
  text: string;
}

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reasonCode: string;
  notes?: string;
}
