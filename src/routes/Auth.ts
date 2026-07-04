import Router from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/User.js";

const router = Router();

router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/register", registerUser);

export default router;
