import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../helper/tokens.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}




export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user", error });
  }
};



export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateAccessToken(String(user._id), user.email);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error });
  }
};

export const logoutUser = async (req: Request, res: Response) => {

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({
    message: "Logout successful",
  });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, age, password } = req.body ?? {};

    if (!name || !email || !age || !password) {
      return res.status(400).json({ message: "Name, email, age, and password are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, age, password });
    const token = generateAccessToken(
      String(user._id),
      user.email
    );

    const refreshToken = generateRefreshToken(
      String(user._id),
      user.email
    );

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
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
        },
      });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error });
  }
};

export const refreshToken = (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token) {
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

    return res.json({
      token:accessToken,
    });
  } catch {
    return res.status(403).json({
      message: "Invalid refresh token",
    });
  }
};