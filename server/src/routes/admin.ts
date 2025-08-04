import { Router, Request, Response } from "express";
import { body, validationResult, param, query } from "express-validator";
import { prisma } from "../services/database.js";
import {
  authenticate,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth.js";
import { io } from "../server.js";

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard statistics
 * @access Admin
 */
router.get("/dashboard", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get case statistics
    const [
      totalCases,
      pendingCases,
      activeCases,
      resolvedCases,
      unresolvedCases,
      totalUsers,
      recentCases,
      casesByType,
      casesByStatus,
    ] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: "PENDING" } }),
      prisma.case.count({
        where: {
          status: {
            in: [
              "AWAITING_RESPONSE",
              "ACCEPTED",
              "WITNESSES_NOMINATED",
              "PANEL_CREATED",
              "MEDIATION_IN_PROGRESS",
            ],
          },
        },
      }),
      prisma.case.count({ where: { status: "RESOLVED" } }),
      prisma.case.count({ where: { status: "UNRESOLVED" } }),
      prisma.user.count(),

      // Recent cases (last 7 days)
      prisma.case.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          complainant: {
            select: { name: true, email: true },
          },
          respondent: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Cases by type
      prisma.case.groupBy({
        by: ["caseType"],
        _count: { caseType: true },
      }),

      // Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    // Calculate resolution rate
    const resolutionRate =
      totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

    res.json({
      statistics: {
        totalCases,
        pendingCases,
        activeCases,
        resolvedCases,
        unresolvedCases,
        totalUsers,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
      },
      recentCases,
      casesByType: casesByType.map((item: any) => ({
        type: item.caseType,
        count: item._count.caseType,
      })),
      casesByStatus: casesByStatus.map((item: any) => ({
        status: item.status,
        count: item._count.status,
      })),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * @route GET /api/admin/cases
 * @desc Get all cases with filters
 * @access Admin
 */
router.get("/cases", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      status,
      caseType,
      priority,
      page = "1",
      limit = "20",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    if (status) where.status = status;
    if (caseType) where.caseType = caseType;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { caseNumber: { contains: search as string, mode: "insensitive" } },
        {
          issueDescription: { contains: search as string, mode: "insensitive" },
        },
        {
          complainant: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
        {
          respondent: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          complainant: {
            select: { id: true, name: true, email: true, phone: true },
          },
          respondent: {
            select: { id: true, name: true, email: true, phone: true },
          },
          evidence: {
            select: { id: true, fileType: true, filePath: true },
          },
          mediationPanel: {
            select: { id: true, createdAt: true },
          },
        },
        orderBy: { createdAt: sortOrder as "asc" | "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.case.count({ where }),
    ]);

    res.json({
      cases,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Admin get cases error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * @route PUT /api/admin/cases/:id/status
 * @desc Update case status
 * @access Admin
 */
router.put(
  "/cases/:id/status",
  [
    param("id").isString().withMessage("Case ID must be a valid string"),
    body("status")
      .isIn([
        "PENDING",
        "AWAITING_RESPONSE",
        "ACCEPTED",
        "WITNESSES_NOMINATED",
        "PANEL_CREATED",
        "MEDIATION_IN_PROGRESS",
        "RESOLVED",
        "UNRESOLVED",
        "CANCELLED",
      ])
      .withMessage("Invalid status"),
    body("reason")
      .optional()
      .isLength({ min: 10, max: 500 })
      .trim()
      .escape()
      .withMessage("Reason must be between 10 and 500 characters"),
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
      const { status, reason } = req.body;

      const caseData = await prisma.case.findUnique({
        where: { id },
        include: {
          complainant: true,
          respondent: true,
        },
      });

      if (!caseData) {
        return res.status(404).json({
          error: "Case not found",
        });
      }

      // Update case status
      const updatedCase = await prisma.case.update({
        where: { id },
        data: { status },
        include: {
          complainant: true,
          respondent: true,
        },
      });

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: id,
          action: "STATUS_UPDATED_BY_ADMIN",
          description: `Status changed from ${caseData.status} to ${status}${
            reason ? ` - ${reason}` : ""
          }`,
          metadata: {
            adminId: req.user!.id,
            previousStatus: caseData.status,
            newStatus: status,
            reason: reason || null,
          },
        },
      });

      // Create notifications for involved parties
      const notifications = [];

      // Notify complainant
      notifications.push(
        prisma.notification.create({
          data: {
            userId: caseData.complainant.id,
            caseId: id,
            type: "CASE_STATUS_UPDATE",
            title: "Case Status Updated",
            message: `Your case #${caseData.caseNumber} status has been updated to ${status}.`,
          },
        })
      );

      // Notify respondent if exists
      if (caseData.respondent) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: caseData.respondent.id,
              caseId: id,
              type: "CASE_STATUS_UPDATE",
              title: "Case Status Updated",
              message: `Case #${caseData.caseNumber} status has been updated to ${status}.`,
            },
          })
        );
      }

      await Promise.all(notifications);

      // Send real-time notifications
      io.emit(`notification_${caseData.complainant.id}`, {
        type: "STATUS_UPDATE",
        caseId: id,
        status,
        message: `Case status updated to ${status}`,
      });

      if (caseData.respondent) {
        io.emit(`notification_${caseData.respondent.id}`, {
          type: "STATUS_UPDATE",
          caseId: id,
          status,
          message: `Case status updated to ${status}`,
        });
      }

      res.json({
        message: "Case status updated successfully",
        case: updatedCase,
      });
    } catch (error) {
      console.error("Admin update case status error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route POST /api/admin/cases/:id/panel
 * @desc Create mediation panel for a case
 * @access Admin
 */
router.post(
  "/cases/:id/panel",
  [
    param("id").isString().withMessage("Case ID must be a valid string"),
    body("lawyerId").isString().withMessage("Lawyer ID is required"),
    body("religiousScholarId")
      .optional()
      .isString()
      .withMessage("Religious scholar ID must be a string"),
    body("societyMemberId")
      .optional()
      .isString()
      .withMessage("Society member ID must be a string"),
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
      const { lawyerId, religiousScholarId, societyMemberId } = req.body;

      // Verify case exists and can have a panel created
      const caseData = await prisma.case.findUnique({
        where: { id },
        include: {
          complainant: true,
          respondent: true,
          mediationPanel: true,
        },
      });

      if (!caseData) {
        return res.status(404).json({
          error: "Case not found",
        });
      }

      if (caseData.mediationPanel) {
        return res.status(409).json({
          error: "Mediation panel already exists for this case",
        });
      }

      if (
        caseData.status !== "WITNESSES_NOMINATED" &&
        caseData.status !== "ACCEPTED"
      ) {
        return res.status(400).json({
          error:
            "Case must be in WITNESSES_NOMINATED or ACCEPTED status to create a panel",
        });
      }

      // Verify panel members exist
      const panelMembers = await prisma.user.findMany({
        where: {
          id: {
            in: [lawyerId, religiousScholarId, societyMemberId].filter(Boolean),
          },
        },
      });

      const requiredMemberIds = [
        lawyerId,
        religiousScholarId,
        societyMemberId,
      ].filter(Boolean);
      if (panelMembers.length !== requiredMemberIds.length) {
        return res.status(400).json({
          error: "One or more panel members not found",
        });
      }

      // Create mediation panel
      const panel = await prisma.mediationPanel.create({
        data: {
          caseId: id,
          lawyerId,
          religiousScholarId: religiousScholarId || null,
          societyMemberId: societyMemberId || null,
        },
        include: {
          lawyer: {
            select: { id: true, name: true, email: true },
          },
          religiousScholar: {
            select: { id: true, name: true, email: true },
          },
          societyMember: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update case status
      await prisma.case.update({
        where: { id },
        data: { status: "PANEL_CREATED" },
      });

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: id,
          action: "PANEL_CREATED",
          description: "Mediation panel created",
          metadata: {
            adminId: req.user!.id,
            panelId: panel.id,
            panelMembers: {
              lawyer: lawyerId,
              religiousScholar: religiousScholarId,
              societyMember: societyMemberId,
            },
          },
        },
      });

      // Create notifications for all parties
      const notifications = [];

      // Notify case parties
      notifications.push(
        prisma.notification.create({
          data: {
            userId: caseData.complainant.id,
            caseId: id,
            type: "PANEL_ASSIGNMENT",
            title: "Mediation Panel Created",
            message: `A mediation panel has been created for your case #${caseData.caseNumber}.`,
          },
        })
      );

      if (caseData.respondent) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: caseData.respondent.id,
              caseId: id,
              type: "PANEL_ASSIGNMENT",
              title: "Mediation Panel Created",
              message: `A mediation panel has been created for case #${caseData.caseNumber}.`,
            },
          })
        );
      }

      // Notify panel members
      panelMembers.forEach((member: any) => {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: member.id,
              caseId: id,
              type: "PANEL_ASSIGNMENT",
              title: "Assigned to Mediation Panel",
              message: `You have been assigned to a mediation panel for case #${caseData.caseNumber}.`,
            },
          })
        );
      });

      await Promise.all(notifications);

      res.status(201).json({
        message: "Mediation panel created successfully",
        panel,
      });
    } catch (error) {
      console.error("Admin create panel error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination
 * @access Admin
 */
router.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          address: true,
          _count: {
            select: {
              casesAsComplainant: true,
              casesAsRespondent: true,
              casesAsWitness: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
