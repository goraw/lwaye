import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import multer from "multer";
import { Router } from "express";
import type { ListingStatus, User } from "@lwaye/shared";
import { store } from "./store";

export const apiRouter = Router();

const allowedListingStatuses: ListingStatus[] = ["draft", "active", "sold", "hidden", "flagged"];
const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");

mkdirSync(uploadsDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, uploadsDirectory);
    },
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }
  return authorization.slice("Bearer ".length).trim();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function publicAssetUrl(request: Request, filename: string): string {
  return `${request.protocol}://${request.get("host")}/uploads/${filename}`;
}

async function requireSessionUser(request: Request, response: Response): Promise<User | undefined> {
  const token = bearerToken(request);
  if (!token) {
    response.status(401).json({ message: "Missing session token" });
    return undefined;
  }

  const user = await store.getSessionUser(token);
  if (!user) {
    response.status(401).json({ message: "Invalid or expired session" });
    return undefined;
  }

  return user;
}

apiRouter.get("/health", async (_request: Request, response: Response) => {
  response.json({ status: "ok" });
});

apiRouter.get("/v1/bootstrap", async (_request: Request, response: Response) => {
  response.json(await store.getBootstrap());
});

apiRouter.post("/v1/auth/start-otp", async (request: Request, response: Response) => {
  if (!isNonEmptyString(request.body?.phone)) {
    response.status(400).json({ message: "Phone is required" });
    return;
  }
  response.json(await store.startOtp(request.body.phone.trim()));
});

apiRouter.post("/v1/auth/verify-otp", async (request: Request, response: Response) => {
  if (!isNonEmptyString(request.body?.phone) || !isNonEmptyString(request.body?.code) || !isNonEmptyString(request.body?.displayName)) {
    response.status(400).json({ message: "Phone, code, and displayName are required" });
    return;
  }

  try {
    response.json(await store.verifyOtp(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
});

apiRouter.get("/v1/auth/me", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }
  response.json({ user });
});

apiRouter.post("/v1/auth/logout", async (request: Request, response: Response) => {
  const token = bearerToken(request);
  if (!token) {
    response.status(204).end();
    return;
  }

  await store.revokeSession(token);
  response.status(204).end();
});

apiRouter.post("/v1/uploads/image", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  upload.single("image")(request, response, (error) => {
    if (error) {
      response.status(400).json({ message: error.message });
      return;
    }

    if (!request.file) {
      response.status(400).json({ message: "Image file is required" });
      return;
    }

    response.status(201).json({
      uploadedBy: user.id,
      url: publicAssetUrl(request, request.file.filename)
    });
  });
});

apiRouter.get("/v1/listings", async (request: Request, response: Response) => {
  const search = one(request.query.search as string | string[] | undefined);
  const categoryId = one(request.query.categoryId as string | string[] | undefined);
  const locationId = one(request.query.locationId as string | string[] | undefined);
  const minPrice = one(request.query.minPrice as string | string[] | undefined);
  const maxPrice = one(request.query.maxPrice as string | string[] | undefined);
  const limit = one(request.query.limit as string | string[] | undefined);

  response.json(
    await store.listFeed({
      search,
      categoryId,
      locationId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      limit: limit ? Number(limit) : undefined
    })
  );
});

apiRouter.get("/v1/listings/:listingId", async (request: Request, response: Response) => {
  const listingId = one(request.params.listingId);
  const listing = listingId ? await store.getListing(listingId) : undefined;
  if (!listing) {
    response.status(404).json({ message: "Listing not found" });
    return;
  }
  response.json(listing);
});

apiRouter.post("/v1/listings", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const body = request.body;
  if (
    body?.sellerId !== user.id ||
    !isNonEmptyString(body?.title) ||
    !isNonEmptyString(body?.description) ||
    !isPositiveNumber(body?.priceETB) ||
    !isNonEmptyString(body?.categoryId) ||
    !isNonEmptyString(body?.locationId) ||
    !Array.isArray(body?.photoUrls)
  ) {
    response.status(400).json({ message: "Invalid listing payload" });
    return;
  }

  response.status(201).json(await store.createListing(body));
});

apiRouter.patch("/v1/listings/:listingId/status", async (request: Request, response: Response) => {
  const status = request.body?.status;
  if (!allowedListingStatuses.includes(status)) {
    response.status(400).json({ message: "Invalid listing status" });
    return;
  }

  const listingId = one(request.params.listingId);
  const listing = listingId ? await store.updateListingStatus(listingId, status) : undefined;
  if (!listing) {
    response.status(404).json({ message: "Listing not found" });
    return;
  }
  response.json(listing);
});

apiRouter.get("/v1/favorites/:userId", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const userId = one(request.params.userId);
  if (!userId || userId !== user.id) {
    response.status(403).json({ message: "Cannot access another user's favorites" });
    return;
  }

  response.json(await store.listFavorites(userId));
});

apiRouter.post("/v1/favorites/:userId/:listingId", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const userId = one(request.params.userId);
  const listingId = one(request.params.listingId);
  if (!userId || !listingId) {
    response.status(400).json({ message: "User and listing are required" });
    return;
  }
  if (userId !== user.id) {
    response.status(403).json({ message: "Cannot modify another user's favorites" });
    return;
  }

  response.json(await store.toggleFavorite(userId, listingId));
});

apiRouter.post("/v1/threads", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  if (!isNonEmptyString(request.body?.listingId) || request.body?.buyerId !== user.id) {
    response.status(400).json({ message: "Invalid thread payload" });
    return;
  }

  try {
    response.status(201).json(await store.startThread(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
});

apiRouter.get("/v1/threads/:userId", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const userId = one(request.params.userId);
  if (!userId || userId !== user.id) {
    response.status(403).json({ message: "Cannot access another user's threads" });
    return;
  }

  response.json(await store.listThreads(userId));
});

apiRouter.get("/v1/messages/:threadId", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const threadId = one(request.params.threadId);
  if (!threadId) {
    response.status(400).json({ message: "Thread is required" });
    return;
  }

  const thread = await store.getThread(threadId);
  if (!thread) {
    response.status(404).json({ message: "Thread not found" });
    return;
  }
  if (thread.buyerId !== user.id && thread.sellerId !== user.id) {
    response.status(403).json({ message: "Cannot access another user's thread" });
    return;
  }

  response.json(await store.listMessages(threadId));
});

apiRouter.post("/v1/messages", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  const threadId = request.body?.threadId;
  const senderId = request.body?.senderId;
  const text = request.body?.text;
  if (!isNonEmptyString(threadId) || senderId !== user.id || !isNonEmptyString(text)) {
    response.status(400).json({ message: "Invalid message payload" });
    return;
  }

  const thread = await store.getThread(threadId);
  if (!thread) {
    response.status(404).json({ message: "Thread not found" });
    return;
  }
  if (thread.buyerId !== user.id && thread.sellerId !== user.id) {
    response.status(403).json({ message: "Cannot send to another user's thread" });
    return;
  }

  try {
    response.status(201).json(await store.sendMessage(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
});

apiRouter.post("/v1/reports", async (request: Request, response: Response) => {
  const user = await requireSessionUser(request, response);
  if (!user) {
    return;
  }

  if (
    request.body?.reporterId !== user.id ||
    !isNonEmptyString(request.body?.targetType) ||
    !isNonEmptyString(request.body?.targetId) ||
    !isNonEmptyString(request.body?.reasonCode)
  ) {
    response.status(400).json({ message: "Invalid report payload" });
    return;
  }

  response.status(201).json(await store.createReport(request.body));
});

apiRouter.get("/v1/admin/dashboard", async (_request: Request, response: Response) => {
  response.json(await store.getAdminDashboard());
});

apiRouter.get("/v1/admin/reports", async (_request: Request, response: Response) => {
  response.json(await store.listReports());
});

apiRouter.patch("/v1/admin/reports/:reportId/resolve", async (request: Request, response: Response) => {
  const reportId = one(request.params.reportId);
  const report = reportId ? await store.resolveReport(reportId) : undefined;
  if (!report) {
    response.status(404).json({ message: "Report not found" });
    return;
  }
  response.json(report);
});

apiRouter.patch("/v1/admin/users/:userId/suspend", async (request: Request, response: Response) => {
  const userId = one(request.params.userId);
  const user = userId ? await store.suspendUser(userId) : undefined;
  if (!user) {
    response.status(404).json({ message: "User not found" });
    return;
  }
  response.json(user);
});
