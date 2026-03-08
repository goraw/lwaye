import type { Request, Response } from "express";
import { Router } from "express";
import { store } from "./store";

export const apiRouter = Router();

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

apiRouter.get("/health", async (_request: Request, response: Response) => {
  response.json({ status: "ok" });
});

apiRouter.get("/v1/bootstrap", async (_request: Request, response: Response) => {
  response.json(await store.getBootstrap());
});

apiRouter.post("/v1/auth/start-otp", async (request: Request, response: Response) => {
  response.json(await store.startOtp(request.body.phone));
});

apiRouter.post("/v1/auth/verify-otp", async (request: Request, response: Response) => {
  try {
    response.json(await store.verifyOtp(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
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
  response.status(201).json(await store.createListing(request.body));
});

apiRouter.patch("/v1/listings/:listingId/status", async (request: Request, response: Response) => {
  const listingId = one(request.params.listingId);
  const listing = listingId ? await store.updateListingStatus(listingId, request.body.status) : undefined;
  if (!listing) {
    response.status(404).json({ message: "Listing not found" });
    return;
  }
  response.json(listing);
});

apiRouter.get("/v1/favorites/:userId", async (request: Request, response: Response) => {
  const userId = one(request.params.userId);
  response.json(userId ? await store.listFavorites(userId) : []);
});

apiRouter.post("/v1/favorites/:userId/:listingId", async (request: Request, response: Response) => {
  const userId = one(request.params.userId);
  const listingId = one(request.params.listingId);
  if (!userId || !listingId) {
    response.status(400).json({ message: "User and listing are required" });
    return;
  }
  response.json(await store.toggleFavorite(userId, listingId));
});

apiRouter.post("/v1/threads", async (request: Request, response: Response) => {
  try {
    response.status(201).json(await store.startThread(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
});

apiRouter.get("/v1/threads/:userId", async (request: Request, response: Response) => {
  const userId = one(request.params.userId);
  response.json(userId ? await store.listThreads(userId) : []);
});

apiRouter.get("/v1/messages/:threadId", async (request: Request, response: Response) => {
  const threadId = one(request.params.threadId);
  response.json(threadId ? await store.listMessages(threadId) : []);
});

apiRouter.post("/v1/messages", async (request: Request, response: Response) => {
  try {
    response.status(201).json(await store.sendMessage(request.body));
  } catch (error) {
    response.status(400).json({ message: (error as Error).message });
  }
});

apiRouter.post("/v1/reports", async (request: Request, response: Response) => {
  response.status(201).json(await store.createReport(request.body));
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
