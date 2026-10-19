import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'devpulse_super_secret_jwt_key_2026_itishree';

// Middleware to verify HTTP-only JWT cookie or Authorization Bearer token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Extract from HTTP-only cookie first, then fallback to Authorization header
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};

// RBAC Middleware: Enforce Role-Based Access Control on Workspaces
export const requireWorkspaceRole = (allowedRoles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId as string;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required for RBAC validation.' });
      }

      // Query membership from normalized schema
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          error: 'Forbidden: Unauthorized cross-workspace data access prevented.',
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          error: `Forbidden: Insufficient privileges. Required: [${allowedRoles.join(', ')}], Current: ${membership.role}`,
        });
      }

      next();
    } catch (err) {
      console.error('[RBAC Error]:', err);
      return res.status(500).json({ error: 'Internal access control error.' });
    }
  };
};
