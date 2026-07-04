import Router from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/User.js";

import {
  loginLimiter,
  logoutLimiter,
  registerLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

router.post("/login", loginLimiter, loginUser);

router.post("/logout", logoutLimiter, logoutUser);

router.post("/register", registerLimiter, registerUser);

router.post("/refresh", refreshLimiter, refreshToken);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPassword
);

router.post(
  "/verify-email",
  verifyEmailLimiter,
  verifyEmail
);

export default router;