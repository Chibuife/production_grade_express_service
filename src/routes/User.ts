import Router from "express";
import { getUserById } from "../controllers/User.js";
import authenticateToken from "../middleware/authmiddleware.js";
import { createAccountLimiter, getProfileLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.use(authenticateToken);

router.get("/:id", getProfileLimiter, getUserById);

export default router;