import dotenv from "dotenv";
import mongoose from "mongoose";
import { logger } from "../../utils/logger.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in the environment variables.");
}

// Prevent registering listeners multiple times.
let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;

  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", error);
  });
};

export const connectToDatabase = async () => {
  registerConnectionListeners();

  switch (mongoose.connection.readyState) {
    case 1:
      logger.debug("MongoDB already connected");
      return mongoose;

    case 2:
      logger.debug("MongoDB connection already in progress");
      return mongoose;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    logger.info("MongoDB connection established");

    return mongoose;
  } catch (error) {
    logger.error("Failed to connect to MongoDB", error);
    throw error;
  }
};

export const disconnectFromDatabase = async () => {
  if (
    mongoose.connection.readyState === 0 ||
    mongoose.connection.readyState === 3
  ) {
    return;
  }

  try {
    await mongoose.disconnect();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Failed to disconnect MongoDB", error);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing MongoDB connection...`);

  try {
    await disconnectFromDatabase();
    logger.info("MongoDB disconnected gracefully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during MongoDB shutdown", error);
    process.exit(1);
  }
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));