import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export default function requestId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.requestId = uuid();

  res.setHeader("X-Request-Id", req.requestId);

  next();
}