import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getWorkspaceDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/document.controller.js';
import { authenticate, requireWorkspaceRole } from '../middleware/auth.js';

const router = Router();

// All document routes require authenticated JWT session
router.use(authenticate);

// Cross-workspace protected route
router.get(
  '/workspace/:workspaceId',
  requireWorkspaceRole([Role.OWNER, Role.EDITOR, Role.VIEWER]),
  getWorkspaceDocuments
);

router.get('/:id', getDocumentById);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
