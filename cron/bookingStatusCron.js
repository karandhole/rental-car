import cron from "node-cron";
import prisma from "../lib/db.config.js";

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    const result = await prisma.booking.updateMany({
      where: {
        status: "IN_RENTAL",
        returnDate: {
          lte: now,
        },
      },
      data: {
        status: "COMPLETED",
      },
    });

    console.log(
      `[BOOKING CRON] ${result.count} booking(s) marked as COMPLETED`
    );
  } catch (error) {
    console.error("[BOOKING CRON ERROR]", error);
  }
});