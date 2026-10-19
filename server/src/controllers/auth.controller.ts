import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'devpulse_super_secret_jwt_key_2026_itishree';
const COOKIE_NAME = 'token';

// Helper to set HTTP-only secure cookie
const setTokenCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // Prevents XSS attacks from reading the token
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, avatarColor } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and auto-create default workspace with OWNER role
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        avatarColor: avatarColor || '#3B82F6',
        ownedWorkspaces: {
          create: {
            name: `${name}'s Workspace`,
            description: 'Personal collaborative workspace',
            members: {
              create: {
                role: Role.OWNER,
                userId: '', // handled by nested create in transaction below
              },
            },
          },
        },
      },
      include: {
        ownedWorkspaces: true,
      },
    });

    // Ensure member connection
    const workspace = user.ownedWorkspaces[0];
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: Role.OWNER,
      },
    });

    // Create starter document
    const starterDoc = await prisma.document.create({
      data: {
        title: 'Getting Started with DevPulse',
        content: `# Welcome ${name}!\n\nThis is your private collaborative workspace.\n\n- Role: OWNER\n- Real-Time Synced via WebSockets\n- Backed by PostgreSQL & Prisma\n`,
        workspaceId: workspace.id,
        authorId: user.id,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setTokenCookie(res, token);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: Role.OWNER,
      },
      initialDocumentId: starterDoc.id,
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    return res.status(500).json({ error: 'Failed to register account.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setTokenCookie(res, token);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      workspaces: user.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      })),
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ message: 'Logged out successfully.' });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        memberships: {
          select: {
            role: true,
            workspace: {
              select: { id: true, name: true, description: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};
