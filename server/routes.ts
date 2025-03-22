import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to get the status of the server
  app.get("/api/status", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // API endpoint to get a list of captured media
  app.get("/api/media", async (req: Request, res: Response) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
