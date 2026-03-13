import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Listing, Report, User } from "@lwaylway/shared";
import { createApp } from "./app";
import { createApiRouter, type ApiStore } from "./routes";

const buyerUser: User = {
  id: "usr-buyer-1",
  phone: "+251912000222",
  verificationStatus: "verified",
  displayName: "Dawit",
  preferredLanguage: "am",
  profileType: "consumer",
  status: "active",
  isPhoneVerified: true,
  isAdmin: false
};

const adminUser: User = {
  id: "usr-admin-1",
  phone: "+251900000001",
  verificationStatus: "verified",
  displayName: "LwayLway Admin",
  preferredLanguage: "en",
  profileType: "consumer",
  status: "active",
  isPhoneVerified: true,
  isAdmin: true
};

const listing: Listing = {
  id: "lst-1",
  sellerId: "usr-seller-1",
  title: "iPhone 13 Pro 256GB",
  description: "Clean condition",
  priceETB: 98000,
  negotiable: true,
  categoryId: "cat-phones",
  condition: "good",
  locationId: "loc-bole",
  photoUrls: [],
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const resolvedReport: Report = {
  id: "rep-1",
  targetType: "listing",
  targetId: listing.id,
  reporterId: buyerUser.id,
  reasonCode: "spam",
  status: "resolved",
  createdAt: new Date().toISOString()
};

function createStore(): ApiStore {
  const sessions = new Map<string, User>([["buyer-token", buyerUser], ["admin-token", adminUser]]);
  const pushTokens: Array<{ userId: string; token: string; platform: string }> = [];

  return {
    async getBootstrap() {
      return { users: [adminUser, buyerUser], profiles: [], categories: [], locations: [] };
    },
    async startOtp(phone: string) {
      return { phone, code: "123456", expiresAt: new Date(Date.now() + 300000).toISOString() };
    },
    async verifyOtp(input) {
      const user = input.phone === adminUser.phone ? adminUser : buyerUser;
      return { user, session: { sessionToken: user.isAdmin ? "admin-token" : "buyer-token", expiresAt: new Date(Date.now() + 300000).toISOString() } };
    },
    async getSessionUser(token: string) {
      return sessions.get(token);
    },
    async revokeSession(token: string) {
      sessions.delete(token);
    },
    async registerPushToken(userId: string, token: string, platform: string) {
      pushTokens.push({ userId, token, platform });
    },
    async removePushToken(userId: string, token: string) {
      const next = pushTokens.filter((entry) => !(entry.userId === userId && entry.token === token));
      pushTokens.length = 0;
      pushTokens.push(...next);
    },
    async listFeed() {
      return { items: [listing] };
    },
    async getListing(listingId: string) {
      return listingId === listing.id ? listing : undefined;
    },
    async createListing(input) {
      return { ...listing, ...input, id: "lst-created", status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },
    async updateListingStatus(listingId: string, status, adminId: string) {
      assert.equal(adminId, adminUser.id);
      return listingId === listing.id ? { ...listing, status } : undefined;
    },
    async listFavorites(userId: string) {
      return userId === buyerUser.id ? [{ id: "fav-1", listingId: listing.id, userId, createdAt: new Date().toISOString() }] : [];
    },
    async toggleFavorite() {
      return [];
    },
    async startThread(input) {
      return { id: "thr-1", listingId: input.listingId, buyerId: input.buyerId, sellerId: listing.sellerId, status: "active", lastMessageAt: new Date().toISOString() };
    },
    async listThreads(userId: string) {
      return userId === buyerUser.id ? [{ id: "thr-1", listingId: listing.id, buyerId: buyerUser.id, sellerId: listing.sellerId, status: "active", lastMessageAt: new Date().toISOString() }] : [];
    },
    async getThread(threadId: string) {
      return threadId === "thr-1" ? { id: "thr-1", listingId: listing.id, buyerId: buyerUser.id, sellerId: listing.sellerId, status: "active", lastMessageAt: new Date().toISOString() } : undefined;
    },
    async listMessages() {
      return [];
    },
    async sendMessage(input) {
      return { id: "msg-1", threadId: input.threadId, senderId: input.senderId, text: input.text, createdAt: new Date().toISOString() };
    },
    async createReport(input) {
      return { ...resolvedReport, reporterId: input.reporterId, targetId: input.targetId, targetType: input.targetType, reasonCode: input.reasonCode, status: "open" };
    },
    async getAdminDashboard() {
      return { users: [adminUser, buyerUser], categories: [], listings: [listing], reports: [resolvedReport] };
    },
    async listReports() {
      return [resolvedReport];
    },
    async resolveReport(reportId: string, adminId: string) {
      assert.equal(adminId, adminUser.id);
      return reportId === resolvedReport.id ? resolvedReport : undefined;
    },
    async suspendUser(userId: string, adminId: string) {
      assert.equal(adminId, adminUser.id);
      return userId === buyerUser.id ? { ...buyerUser, status: "suspended" } : undefined;
    }
  };
}

const servers: Array<{ close: () => void }> = [];

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close();
  }
});

async function createTestClient() {
  const app = createApp(createApiRouter(createStore()));
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test server");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async request(path: string, init?: RequestInit) {
      return fetch(`${this.baseUrl}${path}`, init);
    }
  };
}

test("OTP verification returns a session and user payload", async () => {
  const client = await createTestClient();
  const response = await client.request("/v1/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: buyerUser.phone, code: "123456", displayName: buyerUser.displayName, preferredLanguage: "am" })
  });

  assert.equal(response.status, 200);
  const payload = await response.json() as { user: User; session: { sessionToken: string } };
  assert.equal(payload.user.id, buyerUser.id);
  assert.equal(payload.session.sessionToken, "buyer-token");
});

test("favorites endpoint rejects access to another user", async () => {
  const client = await createTestClient();
  const response = await client.request(`/v1/favorites/${adminUser.id}`, {
    headers: { Authorization: "Bearer buyer-token" }
  });

  assert.equal(response.status, 403);
  const payload = await response.json() as { message: string };
  assert.equal(payload.message, "Cannot access another user's favorites");
});

test("admin dashboard requires an admin session", async () => {
  const client = await createTestClient();
  const response = await client.request("/v1/admin/dashboard", {
    headers: { Authorization: "Bearer buyer-token" }
  });

  assert.equal(response.status, 403);
  const payload = await response.json() as { message: string };
  assert.equal(payload.message, "Admin access required");
});

test("admin can resolve reports", async () => {
  const client = await createTestClient();
  const response = await client.request(`/v1/admin/reports/${resolvedReport.id}/resolve`, {
    method: "PATCH",
    headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  assert.equal(response.status, 200);
  const payload = await response.json() as Report;
  assert.equal(payload.id, resolvedReport.id);
  assert.equal(payload.status, "resolved");
});

test("push token registration requires a session", async () => {
  const client = await createTestClient();
  const response = await client.request("/v1/push-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "ExponentPushToken[test]", platform: "expo" })
  });

  assert.equal(response.status, 401);
});


