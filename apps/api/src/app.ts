import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import type { Router } from "express";
import { apiRouter } from "./routes";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDirectory = path.join(rootDirectory, "uploads");

export function createApp(router: Router = apiRouter) {
  const app = express();
  app.use(cors());
  app.use("/uploads", express.static(uploadsDirectory));
  app.use(express.json());
  app.use(router);
  return app;
}
