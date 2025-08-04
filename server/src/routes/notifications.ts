import { Router, Response } from "express";
import { param, validationResult } from "express-validator";
import { prisma } from "../services/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

/**
 * @route GET /api/notifications
 * @desc Get all notifications for current user
 * @access Private
 */
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = "1", limit = "20", unreadOnly = "false" } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {
        userId: req.user!.id,
      };

      if (unreadOnly === "true") {
        where.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                caseType: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            userId: req.user!.id,
            isRead: false,
          },
        }),
      ]);

      res.json({
        notifications,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
        unreadCount,
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  "/:id/read",
  authenticate,
  [
    param("id")
      .isString()
      .withMessage("Notification ID must be a valid string"),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!notification) {
        return res.status(404).json({
          error: "Notification not found",
        });
      }

      const updatedNotification = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              caseType: true,
              status: true,
            },
          },
        },
      });

      res.json({
        message: "Notification marked as read",
        notification: updatedNotification,
      });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put(
  "/read-all",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: req.user!.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({
        message: "All notifications marked as read",
        updatedCount: result.count,
      });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete(
  "/:id",
  authenticate,
  [
    param("id")
      .isString()
      .withMessage("Notification ID must be a valid string"),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!notification) {
        return res.status(404).json({
          error: "Notification not found",
        });
      }

      await prisma.notification.delete({
        where: { id },
      });

      res.json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;
