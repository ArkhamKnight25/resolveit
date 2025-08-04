import { Router, Request, Response } from "express";
import { body, validationResult, param } from "express-validator";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../services/database.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { io } from "../server.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/evidence/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
    files: 10, // Maximum 10 files per upload
  },
  fileFilter: function (req, file, cb) {
    // Allow images, videos, audio, and documents
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images, videos, audio, and documents are allowed."
        )
      );
    }
  },
});

/**
 * @route POST /api/cases
 * @desc Register a new case
 * @access Private
 */
router.post(
  "/",
  authenticate,
  upload.array("evidence", 10),
  [
    body("caseType")
      .isIn(["FAMILY", "BUSINESS", "CRIMINAL", "PROPERTY", "CONTRACT", "OTHER"])
      .withMessage("Invalid case type"),
    body("issueDescription")
      .isLength({ min: 50, max: 2000 })
      .trim()
      .escape()
      .withMessage("Issue description must be between 50 and 2000 characters"),
    body("oppositePartyName")
      .isLength({ min: 2, max: 100 })
      .trim()
      .escape()
      .withMessage("Opposite party name must be between 2 and 100 characters"),
    body("oppositePartyEmail")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email for opposite party"),
    body("oppositePartyPhone")
      .optional()
      .isLength({ min: 10, max: 20 })
      .withMessage("Phone number must be between 10 and 20 characters"),
    body("oppositePartyAddress")
      .optional()
      .isLength({ min: 10, max: 200 })
      .trim()
      .escape()
      .withMessage(
        "Opposite party address must be between 10 and 200 characters"
      ),
    body("isInCourt")
      .isBoolean()
      .withMessage("isInCourt must be a boolean value"),
    body("isInPoliceStation")
      .isBoolean()
      .withMessage("isInPoliceStation must be a boolean value"),
    body("courtCaseNumber")
      .optional()
      .isLength({ min: 5, max: 50 })
      .trim()
      .escape()
      .withMessage("Court case number must be between 5 and 50 characters"),
    body("firNumber")
      .optional()
      .isLength({ min: 5, max: 50 })
      .trim()
      .escape()
      .withMessage("FIR number must be between 5 and 50 characters"),
    body("courtName")
      .optional()
      .isLength({ min: 5, max: 100 })
      .trim()
      .escape()
      .withMessage("Court name must be between 5 and 100 characters"),
    body("policeStationName")
      .optional()
      .isLength({ min: 5, max: 100 })
      .trim()
      .escape()
      .withMessage("Police station name must be between 5 and 100 characters"),
    body("priority")
      .optional()
      .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .withMessage("Priority must be one of: LOW, MEDIUM, HIGH, URGENT"),
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

      const {
        caseType,
        issueDescription,
        oppositePartyName,
        oppositePartyEmail,
        oppositePartyPhone,
        oppositePartyAddress,
        isInCourt,
        isInPoliceStation,
        courtCaseNumber,
        firNumber,
        courtName,
        policeStationName,
        priority = "MEDIUM",
      } = req.body;

      // Validate legal proceedings data
      if (isInCourt && (!courtCaseNumber || !courtName)) {
        return res.status(400).json({
          error:
            "Court case number and court name are required when case is in court",
        });
      }

      if (isInPoliceStation && (!firNumber || !policeStationName)) {
        return res.status(400).json({
          error:
            "FIR number and police station name are required when case is with police",
        });
      }

      // Check if opposite party is a registered user
      let respondentId = null;
      if (oppositePartyEmail) {
        const oppositePartyUser = await prisma.user.findUnique({
          where: { email: oppositePartyEmail },
        });
        if (oppositePartyUser) {
          respondentId = oppositePartyUser.id;
        }
      }

      // Generate unique case number
      const caseNumber = `RES-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create case
      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          caseType,
          issueDescription,
          complainantId: req.user!.id,
          respondentId,
          oppositePartyName,
          oppositePartyEmail,
          oppositePartyPhone,
          oppositePartyAddress,
          isInCourt: Boolean(isInCourt),
          isInPoliceStation: Boolean(isInPoliceStation),
          courtCaseNumber,
          firNumber,
          courtName,
          policeStationName,
          priority,
          status: "PENDING",
        },
        include: {
          complainant: {
            select: { id: true, name: true, email: true, phone: true },
          },
          respondent: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      // Handle evidence uploads
      const evidenceFiles = req.files as Express.Multer.File[];
      if (evidenceFiles && evidenceFiles.length > 0) {
        const evidenceData = evidenceFiles.map((file) => {
          let fileType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" = "DOCUMENT";

          if (file.mimetype.startsWith("image/")) fileType = "IMAGE";
          else if (file.mimetype.startsWith("video/")) fileType = "VIDEO";
          else if (file.mimetype.startsWith("audio/")) fileType = "AUDIO";

          return {
            fileName: file.filename,
            originalName: file.originalname,
            fileType,
            fileSize: file.size,
            fileUrl: `/uploads/evidence/${file.filename}`,
            caseId: newCase.id,
          };
        });

        await prisma.evidence.createMany({
          data: evidenceData,
        });
      }

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: newCase.id,
          action: "CASE_CREATED",
          description: "Case registered successfully",
          performedById: req.user!.id,
        },
      });

      // Create notification for complainant
      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          caseId: newCase.id,
          type: "CASE_STATUS_UPDATE",
          title: "Case Registered Successfully",
          message: `Your case #${newCase.caseNumber} has been registered and is pending review.`,
        },
      });

      // If opposite party is registered, create notification for them
      if (respondentId) {
        await prisma.notification.create({
          data: {
            userId: respondentId,
            caseId: newCase.id,
            type: "CASE_STATUS_UPDATE",
            title: "New Case Filed Against You",
            message: `A new case #${newCase.caseNumber} has been filed against you. Please review and respond.`,
          },
        });

        // Update case status to AWAITING_RESPONSE
        await prisma.case.update({
          where: { id: newCase.id },
          data: { status: "AWAITING_RESPONSE" },
        });

        // Send real-time notification via WebSocket
        io.emit(`notification_${respondentId}`, {
          type: "NEW_CASE",
          caseId: newCase.id,
          message: "A new case has been filed against you",
        });
      }

      // Get the complete case with evidence
      const caseWithEvidence = await prisma.case.findUnique({
        where: { id: newCase.id },
        include: {
          complainant: {
            select: { id: true, name: true, email: true, phone: true },
          },
          respondent: {
            select: { id: true, name: true, email: true, phone: true },
          },
          evidence: true,
        },
      });

      res.status(201).json({
        message: "Case registered successfully",
        case: caseWithEvidence,
      });
    } catch (error) {
      console.error("Case registration error:", error);
      res.status(500).json({
        error: "Internal server error during case registration",
      });
    }
  }
);

/**
 * @route GET /api/cases
 * @desc Get all cases for current user
 * @access Private
 */
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, caseType, page = "1", limit = "10" } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {
        OR: [{ complainantId: req.user!.id }, { respondentId: req.user!.id }],
      };

      if (status) {
        where.status = status;
      }

      if (caseType) {
        where.caseType = caseType;
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
              select: {
                id: true,
                fileName: true,
                fileType: true,
                filePath: true,
              },
            },
            _count: {
              select: {
                witnesses: true,
                notifications: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
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
      console.error("Get cases error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route GET /api/cases/:id
 * @desc Get a specific case by ID
 * @access Private
 */
router.get(
  "/:id",
  authenticate,
  [param("id").isString().withMessage("Case ID must be a valid string")],
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

      const caseData = await prisma.case.findFirst({
        where: {
          id,
          OR: [{ complainantId: req.user!.id }, { respondentId: req.user!.id }],
        },
        include: {
          complainant: {
            select: { id: true, name: true, email: true, phone: true },
          },
          respondent: {
            select: { id: true, name: true, email: true, phone: true },
          },
          evidence: true,
          witnesses: true,
          mediationPanel: true,
          caseHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!caseData) {
        return res.status(404).json({
          error: "Case not found or you do not have access to this case",
        });
      }

      res.json({
        case: caseData,
      });
    } catch (error) {
      console.error("Get case error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route POST /api/cases/:id/respond
 * @desc Respond to a case as the opposite party
 * @access Private
 */
router.post(
  "/:id/respond",
  authenticate,
  [
    param("id").isString().withMessage("Case ID must be a valid string"),
    body("accepted")
      .isBoolean()
      .withMessage("accepted must be a boolean value"),
    body("response")
      .optional()
      .isLength({ min: 10, max: 1000 })
      .trim()
      .escape()
      .withMessage("Response must be between 10 and 1000 characters"),
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
      const { accepted, response } = req.body;

      // Find the case and verify user is the respondent
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          respondentId: req.user!.id,
          status: "AWAITING_RESPONSE",
        },
        include: {
          complainant: true,
        },
      });

      if (!caseData) {
        return res.status(404).json({
          error: "Case not found or you cannot respond to this case",
        });
      }

      // Update case with response
      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          respondentAccepted: accepted,
          respondentResponse: response,
          respondentResponseAt: new Date(),
          status: accepted ? "ACCEPTED" : "UNRESOLVED",
        },
        include: {
          complainant: true,
          respondent: true,
        },
      });

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: id,
          action: accepted ? "CASE_ACCEPTED" : "CASE_REJECTED",
          description: `Respondent ${
            accepted ? "accepted" : "rejected"
          } the case`,
          performedById: req.user!.id,
        },
      });

      // Create notification for complainant
      await prisma.notification.create({
        data: {
          userId: caseData.complainant.id,
          caseId: id,
          type: "CASE_STATUS_UPDATE",
          title: `Case Response Received`,
          message: `The opposite party has ${
            accepted ? "accepted" : "rejected"
          } your case #${caseData.caseNumber}.`,
        },
      });

      // Send real-time notification
      io.emit(`notification_${caseData.complainant.id}`, {
        type: "CASE_RESPONSE",
        caseId: id,
        accepted,
        message: `Response received for case #${caseData.caseNumber}`,
      });

      res.json({
        message: `Case response recorded successfully`,
        case: updatedCase,
      });
    } catch (error) {
      console.error("Case response error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route POST /api/cases/:id/witnesses
 * @desc Add witnesses to a case
 * @access Private
 */
router.post(
  "/:id/witnesses",
  authenticate,
  [
    param("id").isString().withMessage("Case ID must be a valid string"),
    body("witnessEmails")
      .isArray({ min: 1 })
      .withMessage("At least one witness email is required"),
    body("witnessEmails.*")
      .isEmail()
      .normalizeEmail()
      .withMessage("All witness emails must be valid"),
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
      const { witnessEmails } = req.body;

      // Verify user has access to this case and case is in correct status
      const caseData = await prisma.case.findFirst({
        where: {
          id,
          OR: [{ complainantId: req.user!.id }, { respondentId: req.user!.id }],
          status: "ACCEPTED",
        },
      });

      if (!caseData) {
        return res.status(404).json({
          error: "Case not found or you cannot add witnesses to this case",
        });
      }

      // Find witness users
      const witnesses = await prisma.user.findMany({
        where: {
          email: { in: witnessEmails },
        },
        select: { id: true, email: true, name: true },
      });

      if (witnesses.length !== witnessEmails.length) {
        return res.status(400).json({
          error:
            "Some witnesses are not registered users. All witnesses must be registered.",
        });
      }

      // Add witnesses to case
      const witnessData = witnesses.map((witness: any) => ({
        caseId: id,
        name: witness.name,
        email: witness.email,
        phone: witness.phone || "",
        relationship: "Nominated Witness",
        statement: null,
      }));

      await prisma.witness.createMany({
        data: witnessData,
        skipDuplicates: true,
      });

      // Update case status
      await prisma.case.update({
        where: { id },
        data: { status: "WITNESSES_NOMINATED" },
      });

      // Create notifications for witnesses
      await Promise.all(
        witnesses.map((witness: any) =>
          prisma.notification.create({
            data: {
              userId: witness.id,
              caseId: id,
              type: "CASE_STATUS_UPDATE",
              title: "Added as Witness",
              message: `You have been added as a witness in case #${caseData.caseNumber}.`,
            },
          })
        )
      );

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: id,
          action: "WITNESSES_ADDED",
          description: `${witnesses.length} witnesses nominated`,
          performedById: req.user!.id,
        },
      });

      res.json({
        message: "Witnesses added successfully",
        witnesses: witnesses,
      });
    } catch (error) {
      console.error("Add witnesses error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

export default router;
