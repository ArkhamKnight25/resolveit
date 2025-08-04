import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@resolveit.com" },
    update: {},
    create: {
      email: "admin@resolveit.com",
      password: adminPassword,
      name: "System Administrator",
      phone: "+1-555-0100",
      role: "ADMIN",
      isVerified: true,
    },
  });

  // Create sample users
  const userPassword = await bcrypt.hash("password123", 12);

  const user1 = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      password: userPassword,
      name: "John Doe",
      phone: "+1-555-0101",
      role: "USER",
      isVerified: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane.smith@example.com" },
    update: {},
    create: {
      email: "jane.smith@example.com",
      password: userPassword,
      name: "Jane Smith",
      phone: "+1-555-0102",
      role: "USER",
      isVerified: true,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "bob.wilson@example.com" },
    update: {},
    create: {
      email: "bob.wilson@example.com",
      password: userPassword,
      name: "Bob Wilson",
      phone: "+1-555-0103",
      role: "USER",
      isVerified: true,
    },
  });

  // Create sample cases
  const case1 = await prisma.case.create({
    data: {
      caseNumber: "RES-2024-001",
      caseType: "CONTRACT_DISPUTE",
      issueDescription:
        "Dispute regarding non-payment for freelance web development services. The client received the completed website but has not paid the agreed amount of $5,000 despite multiple reminders.",
      status: "AWAITING_RESPONSE",
      priority: "HIGH",
      complainantId: user1.id,
      respondentId: user2.id,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      caseNumber: "RES-2024-002",
      caseType: "PROPERTY_DISPUTE",
      issueDescription:
        "Neighbor dispute regarding property boundary lines and fence placement. The fence was installed 2 feet into my property without permission.",
      status: "PENDING",
      priority: "MEDIUM",
      complainantId: user2.id,
      respondentId: user3.id,
    },
  });

  const case3 = await prisma.case.create({
    data: {
      caseNumber: "RES-2024-003",
      caseType: "EMPLOYMENT_DISPUTE",
      issueDescription:
        "Wrongful termination case. Employee was fired without proper notice or severance pay, despite having a valid employment contract.",
      status: "PANEL_CREATED",
      priority: "URGENT",
      complainantId: user3.id,
      respondentId: user1.id,
    },
  });

  const case4 = await prisma.case.create({
    data: {
      caseNumber: "RES-2024-004",
      caseType: "CONSUMER_COMPLAINT",
      issueDescription:
        "Defective product complaint. Purchased a laptop that stopped working after 3 days. Seller refuses to provide refund or replacement.",
      status: "RESOLVED",
      priority: "LOW",
      complainantId: user1.id,
    },
  });

  // Create case history entries
  await prisma.caseHistory.createMany({
    data: [
      {
        caseId: case1.id,
        action: "CASE_CREATED",
        description: "Case created and submitted for review",
        performedById: user1.id,
      },
      {
        caseId: case1.id,
        action: "STATUS_UPDATED",
        description: "Case status updated to AWAITING_RESPONSE",
        performedById: admin.id,
      },
      {
        caseId: case2.id,
        action: "CASE_CREATED",
        description: "Case created and submitted for review",
        performedById: user2.id,
      },
      {
        caseId: case3.id,
        action: "CASE_CREATED",
        description: "Case created and submitted for review",
        performedById: user3.id,
      },
      {
        caseId: case3.id,
        action: "PANEL_CREATED",
        description: "Mediation panel created for case resolution",
        performedById: admin.id,
      },
      {
        caseId: case4.id,
        action: "CASE_CREATED",
        description: "Case created and submitted for review",
        performedById: user1.id,
      },
      {
        caseId: case4.id,
        action: "CASE_RESOLVED",
        description: "Case resolved successfully through mediation",
        performedById: admin.id,
      },
    ],
  });

  // Create sample witnesses
  await prisma.witness.createMany({
    data: [
      {
        caseId: case1.id,
        name: "Mike Johnson",
        email: "mike.johnson@example.com",
        phone: "+1-555-0201",
        relationship: "Project Manager",
        statement:
          "I can confirm that John completed all the work as specified in the contract and delivered on time.",
      },
      {
        caseId: case2.id,
        name: "Sarah Davis",
        email: "sarah.davis@example.com",
        phone: "+1-555-0202",
        relationship: "Neighbor",
        statement:
          "I witnessed the fence being installed and can confirm it encroaches on Jane's property.",
      },
      {
        caseId: case3.id,
        name: "Tom Anderson",
        email: "tom.anderson@example.com",
        phone: "+1-555-0203",
        relationship: "Colleague",
        statement:
          "Bob was a dedicated employee and the termination seemed sudden and without proper cause.",
      },
    ],
  });

  // Create mediation panel for case 3
  await prisma.mediationPanel.create({
    data: {
      caseId: case3.id,
    },
  });

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        type: "CASE_UPDATE",
        title: "Case Status Updated",
        message:
          "Your case RES-2024-001 status has been updated to AWAITING_RESPONSE",
        isRead: false,
      },
      {
        userId: user2.id,
        type: "NEW_RESPONSE",
        title: "Response Required",
        message: "You have a new case RES-2024-001 that requires your response",
        isRead: false,
      },
      {
        userId: user3.id,
        type: "PANEL_CREATED",
        title: "Mediation Panel Created",
        message:
          "A mediation panel has been created for your case RES-2024-003",
        isRead: true,
      },
      {
        userId: user1.id,
        type: "CASE_RESOLVED",
        title: "Case Resolved",
        message: "Your case RES-2024-004 has been successfully resolved",
        isRead: true,
      },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log("");
  console.log("👤 Sample Users Created:");
  console.log("   Admin: admin@resolveit.com (password: admin123)");
  console.log("   User 1: john.doe@example.com (password: password123)");
  console.log("   User 2: jane.smith@example.com (password: password123)");
  console.log("   User 3: bob.wilson@example.com (password: password123)");
  console.log("");
  console.log("📁 Sample Cases Created:");
  console.log("   • Contract Dispute (AWAITING_RESPONSE)");
  console.log("   • Property Dispute (PENDING)");
  console.log("   • Employment Dispute (PANEL_CREATED)");
  console.log("   • Consumer Complaint (RESOLVED)");
  console.log("");
  console.log("🔗 Database URL: Check your .env file");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
