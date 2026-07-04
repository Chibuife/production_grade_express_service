import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        logger.error("Missing bearer token", { path: req.path });
        return res.status(401).json({ message: "Unauthorized: Missing bearer token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        logger.error("Invalid bearer token", { path: req.path });
        return res.status(401).json({ message: "Unauthorized: Invalid bearer token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret") as {
            id?: string;
            email?: string;
        };

        req.user = {
            id: decoded.id || "",
            email: decoded.email || "",
        };

        logger.info("Authenticated request", { userId: req.user.id, path: req.path });
        return next();
    } catch (error) {
        logger.error("Invalid token", { error, path: req.path });
        return res.status(403).json({ message: "Forbidden: Invalid token", error });
    }
};

export default authenticateToken;
