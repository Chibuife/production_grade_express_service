import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../helper/tokens.js";
import { logger } from "../utils/logger.js";
import redisClient from "../config/redis/index.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  traceId: string;
  requestId: string;
}



export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  logger.debug("getUserById controller called");

  try {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      logger.warn(`User not found. ID: ${req.user?.id}`);

      return res.status(404).json({
        message: "User not found",
      });
    }

    logger.info(`[${req.requestId ?? "-"}] Fetched profile for ${user.email}`);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    logger.error("Failed to fetch user profile", error);

    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  logger.debug("loginUser controller called");

  try {
    const { email, password } = req.body ?? {};



    if (!email || !password) {
      logger.warn("Login attempt missing email or password");

      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const key = `login:${email}`;

    const attempts = await redisClient.get(key);

    if (attempts && Number(attempts) >= 5) {
      const attemptCount = Number(attempts);

      logger.warn(
        `Too many login attempts for ${email}. Attempts: ${attemptCount}`
      );

      return res.status(429).json({
        message: "Too many login attempts. Try again in 15 minutes.",
        attempts: attemptCount,
        maxAttempts: 5,
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn(`Login failed. User not found: ${email}`);
      await redisClient.incr(key);
      await redisClient.expire(key, 15 * 60);
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.warn(`Invalid password for ${email}`);
      await redisClient.incr(key);
      await redisClient.expire(key, 15 * 60);
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken(
      String(user._id),
      user.email
    );

    const refreshToken = generateRefreshToken(
      String(user._id),
      user.email
    );

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] User logged in: ${user.email}`);
    await redisClient.del(key);
    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Login successful",
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
        },
      });
  } catch (error) {
    logger.error("Login failed", error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

export const logoutUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  logger.debug("logoutUser controller called");

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  logger.info(`[${req.requestId ?? "-"}] User logged out: ${req.user?.email ?? "Unknown"}`);

  return res.status(200).json({
    message: "Logout successful",
  });
};

export const registerUser = async (req: Request, res: Response) => {
  logger.debug("registerUser controller called");

  try {
    const { name, email, age, password } = req.body ?? {};

    if (!name || !email || !age || !password) {
      logger.warn("Registration missing required fields");

      return res.status(400).json({
        message: "Name, email, age, and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.warn(`Registration failed. User exists: ${email}`);

      return res.status(409).json({
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      age,
      password,
    });

    const accessToken = generateAccessToken(
      String(user._id),
      user.email
    );

    const refreshToken = generateRefreshToken(
      String(user._id),
      user.email
    );

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] New user registered: ${user.email}`);

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        message: "User registered successfully",
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
        },
      });
  } catch (error) {
    logger.error("Registration failed", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

export const refreshToken = (req: Request, res: Response) => {
  logger.debug("refreshToken controller called");

  const token = req.cookies.refreshToken;

  if (!token) {
    logger.warn("Refresh token missing");

    return res.status(401).json({
      message: "Refresh token missing",
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.REFRESH_SECRET!
    ) as {
      id: string;
      email: string;
    };

    const accessToken = generateAccessToken(
      payload.id,
      payload.email
    );

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] Access token refreshed for ${payload.email}`);

    return res.status(200).json({
      token: accessToken,
    });
  } catch (error) {
    logger.warn("Invalid refresh token");
    logger.error(error);

    return res.status(403).json({
      message: "Invalid refresh token",
    });
  }
};



export const forgotPassword = async (req: Request, res: Response) => {
  logger.debug("forgotPassword controller called");

  try {
    const { email } = req.body;

    if (!email) {
      logger.warn("Forgot password missing email");

      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const ipKey = `forgot:ip:${req.ip}`;
    const emailKey = `forgot:email:${normalizedEmail}`;

    const [ipAttempts, emailAttempts] = await Promise.all([
      redisClient.get(ipKey),
      redisClient.get(emailKey),
    ]);

    if (ipAttempts && Number(ipAttempts) >= 20) {
      logger.warn(`Forgot password IP limit exceeded: ${req.ip}`);

      return res.status(429).json({
        message: "Too many password reset requests.",
      });
    }

    if (emailAttempts && Number(emailAttempts) >= 5) {
      logger.warn(`Forgot password email limit exceeded: ${normalizedEmail}`);

      return res.status(429).json({
        message: "Too many password reset requests for this account.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] Password reset requested for ${normalizedEmail}`);
    }

    await redisClient.incr(ipKey);
    await redisClient.expire(ipKey, 60 * 60);

    await redisClient.incr(emailKey);
    await redisClient.expire(emailKey, 60 * 60);

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] Password reset requested for ${normalizedEmail}`);

    return res.status(200).json({
      message:
        "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    logger.error("Forgot password failed", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const resetPassword = async (req: Request, res: Response) => {
  logger.debug("resetPassword controller called");

  try {
    const ipKey = `reset:ip:${req.ip}`;

    const attempts = await redisClient.get(ipKey);

    if (attempts && Number(attempts) >= 20) {
      logger.warn(`Reset password IP limit exceeded: ${req.ip}`);

      return res.status(429).json({
        message: "Too many reset attempts.",
      });
    }

    await redisClient.incr(ipKey);
    await redisClient.expire(ipKey, 60 * 60);

    // Verify reset token.
    // Update password.
    // Invalidate reset token.

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] Password reset completed`);

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error("Reset password failed", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const verifyEmail = async (req: Request, res: Response) => {
  logger.debug("verifyEmail controller called");

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const ipKey = `verify:ip:${req.ip}`;
    const emailKey = `verify:email:${normalizedEmail}`;

    const [ipAttempts, emailAttempts] = await Promise.all([
      redisClient.get(ipKey),
      redisClient.get(emailKey),
    ]);

    if (ipAttempts && Number(ipAttempts) >= 20) {
      return res.status(429).json({
        message: "Too many verification requests.",
      });
    }

    if (emailAttempts && Number(emailAttempts) >= 5) {
      return res.status(429).json({
        message: "Too many verification requests for this email.",
      });
    }

    await redisClient.incr(ipKey);
    await redisClient.expire(ipKey, 60 * 60);

    await redisClient.incr(emailKey);
    await redisClient.expire(emailKey, 60 * 60);

    // Verify email token or send verification email here.

    logger.info(`[${(req as AuthenticatedRequest).requestId ?? "-"}] Email verification requested for ${normalizedEmail}`);

    return res.status(200).json({
      message: "Verification email sent.",
    });
  } catch (error) {
    logger.error("Email verification failed", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};