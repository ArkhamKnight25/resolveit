import { Router, Request, Response } from "express";
import { body, validationResult, param } from "express-validator";
import { prisma } from "../services/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get(
  "/profile",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          _count: {
            select: {
              casesAsComplainant: true,
              casesAsRespondent: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          stats: user._count,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  "/profile",
  authenticate,
  [
    body("name")
      .optional()
      .isLength({ min: 2, max: 50 })
      .trim()
      .escape()
      .withMessage("Name must be between 2 and 50 characters"),
    body("phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Please provide a valid phone number"),
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

      const { name, phone } = req.body;

      // Check if phone number is already taken by another user
      if (phone) {
        const existingUser = await prisma.user.findFirst({
          where: {
            phone,
            NOT: { id: req.user!.id },
          },
        });

        if (existingUser) {
          return res.status(409).json({
            error: "Phone number is already taken by another user",
          });
        }
      }

      // Update user
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
      });

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route GET /api/users/search
 * @desc Search users by email or phone
 * @access Private
 */
router.get(
  "/search",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, phone } = req.query;

      if (!email && !phone) {
        return res.status(400).json({
          error: "Either email or phone parameter is required",
        });
      }

      const where: any = {};
      if (email) {
        where.email = email as string;
      }
      if (phone) {
        where.phone = phone as string;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      });

      res.json({
        users,
      });
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID (limited public info)
 * @access Private
 */
router.get(
  "/:id",
  authenticate,
  [param("id").isString().withMessage("User ID must be a valid string")],
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

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      res.json({
        user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;
