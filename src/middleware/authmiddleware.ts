import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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
        return res.status(401).json({ message: "Unauthorized: Missing bearer token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
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

        return next();
    } catch (error) {
        return res.status(403).json({ message: "Forbidden: Invalid token", error });
    }
};

export default authenticateToken;
