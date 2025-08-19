import express from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '../shared/types';

// Augment the Express Request type globally to include the 'user' property.
// This is moved here from server.ts to ensure it's available wherever the middleware is imported.
declare global {
  namespace Express {
    export interface Request {
      user?: User;
    }
  }
}

// El chequeo de JWT_SECRET se hace en server.ts al arrancar.
// Se usa '!' para asegurar a TypeScript que la variable existirá.
const JWT_SECRET = process.env.JWT_SECRET!;

export const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded as User;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

export const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied, admin role required' });
    }
    next();
};