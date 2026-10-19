import { Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const getWorkspaceDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const documents = await prisma.document.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        author: {
          select: { name: true, avatarColor: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(documents);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
        author: {
          select: { id: true, name: true, avatarColor: true },
        },
        versions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // RBAC check: verify user is a member of the workspace this document belongs to
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.id,
          workspaceId: document.workspaceId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden: Unauthorized cross-workspace data access prevented.',
      });
    }

    return res.json({
      ...document,
      currentUserRole: membership.role,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve document.' });
  }
};

export const createDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { title, workspaceId, content } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }

    const document = await prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        content: content || '',
        workspaceId,
        authorId: req.user!.id,
      },
    });

    return res.status(201).json(document);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create document.' });
  }
};

export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Verify user is OWNER or EDITOR
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.id,
          workspaceId: existingDoc.workspaceId,
        },
      },
    });

    if (!membership || membership.role === Role.VIEWER) {
      return res.status(403).json({
        error: 'Forbidden: Viewer role has read-only permissions.',
      });
    }

    // Count versions for snapshot tracking
    const versionCount = await prisma.documentVersion.count({ where: { documentId: id } });

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingDoc.title,
        content: content !== undefined ? content : existingDoc.content,
        versions: content
          ? {
              create: {
                content: existingDoc.content,
                versionNumber: versionCount + 1,
              },
            }
          : undefined,
      },
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update document.' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Only OWNER can delete
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.id,
          workspaceId: existingDoc.workspaceId,
        },
      },
    });

    if (!membership || membership.role !== Role.OWNER) {
      return res.status(403).json({
        error: 'Forbidden: Only workspace OWNER can delete documents.',
      });
    }

    await prisma.document.delete({ where: { id } });

    return res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
};
