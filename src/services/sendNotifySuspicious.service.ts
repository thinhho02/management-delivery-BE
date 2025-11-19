import SessionModel from "@/models/session.js";
import { io } from "@/socket/index.js";
import type { Lookup } from "geoip-lite";


export const sendSuspiciousNotification = async (sessionSuspicious: string, accountId: string, parsedUA: UAParser.IResult, geo: Lookup | null, time: Date, collectionName: string) => {
  const title = "Cảnh báo đăng nhập bất thường";
  const message = `Thiết bị lạ vừa đăng nhập từ ${parsedUA.browser.name} trên ${parsedUA.os.name} tại ${geo?.city ?? "Không rõ"}.`;

  const sessionQuery: any = {
    isTrusted: true,
    isActive: true,
  };

  if (collectionName === "business") {
    sessionQuery.business = accountId;
  } else {
    sessionQuery.employee = accountId;
  }
  // Lấy các trusted sessions
  const trustedSessions = await SessionModel.find(sessionQuery);

  if (!trustedSessions.length) return;

  // Gửi socket đến từng trusted session
  for (const trusted of trustedSessions) {
    io.to(trusted.id.toString()).emit("event:device_suspicious", {
      sid: sessionSuspicious,
      id: trusted.id,
      title,
      message,
      time,
      type: "suspicious_login",
    });
  }
}