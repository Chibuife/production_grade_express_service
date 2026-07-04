import { Request, Response } from "express";
import mongoose from "mongoose";
import redisClient from "../config/redis/index.js";

export const live = (_req: Request, res: Response) => {
  return res.status(200).json({
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

export const ready = async (_req: Request, res: Response) => {
  const mongo =
    mongoose.connection.readyState === 1 ? "UP" : "DOWN";

  let redis = "DOWN";

  try {
    await redisClient.ping();
    redis = "UP";
  } catch {}

  const healthy =
    mongo === "UP" &&
    redis === "UP";

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "UP" : "DOWN",
    services: {
      mongodb: mongo,
      redis,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};