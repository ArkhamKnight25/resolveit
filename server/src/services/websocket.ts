import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./database.js";

export const setupWebSocket = (io: Server) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`User ${user.name} (${user.id}) connected to WebSocket`);

    // Join user to their personal room for notifications
    socket.join(`user_${user.id}`);

    // Handle case updates subscription
    socket.on("subscribe_case", (caseId: string) => {
      socket.join(`case_${caseId}`);
      console.log(`User ${user.id} subscribed to case ${caseId}`);
    });

    socket.on("unsubscribe_case", (caseId: string) => {
      socket.leave(`case_${caseId}`);
      console.log(`User ${user.id} unsubscribed from case ${caseId}`);
    });

    // Handle admin dashboard subscription
    socket.on("subscribe_admin", () => {
      socket.join("admin_dashboard");
      console.log(`Admin ${user.id} subscribed to dashboard updates`);
    });

    socket.on("unsubscribe_admin", () => {
      socket.leave("admin_dashboard");
      console.log(`Admin ${user.id} unsubscribed from dashboard updates`);
    });

    // Handle typing indicators for case discussions
    socket.on("typing_start", (data: { caseId: string }) => {
      socket.to(`case_${data.caseId}`).emit("user_typing", {
        userId: user.id,
        userName: user.name,
        caseId: data.caseId,
      });
    });

    socket.on("typing_stop", (data: { caseId: string }) => {
      socket.to(`case_${data.caseId}`).emit("user_stopped_typing", {
        userId: user.id,
        caseId: data.caseId,
      });
    });

    // Handle case status updates
    socket.on(
      "case_status_update",
      (data: { caseId: string; status: string }) => {
        io.to(`case_${data.caseId}`).emit("case_status_changed", {
          caseId: data.caseId,
          status: data.status,
          timestamp: new Date(),
        });
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${user.name} (${user.id}) disconnected from WebSocket`);
    });

    // Send welcome message
    socket.emit("connected", {
      message: "Connected to ResolveIt real-time service",
      user: {
        id: user.id,
        name: user.name,
      },
    });
  });

  return io;
};
