import prisma from "../../../lib/db.config.js";

// Admin lists all unavailability requests (with optional status filter)
export const listAllUnavailabilityRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const requests = await prisma.carUnavailabilityRequest.findMany({
      where,
      include: {
        car: { select: { id: true, name: true, thumbnail: true, isAvailable: true } },
        partner: { select: { id: true, name: true, phoneNum: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error: error.message });
  }
};

const AUTO_CANCEL_REASON =
  "Automatically cancelled: car unavailability block approved by admin overlaps this booking.";

// Admin approves → car becomes unavailable
export const approveUnavailabilityRequest = async (req, res) => {
  try {
    const request = await prisma.carUnavailabilityRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Request is already processed" });
    }

    const blockStart = request.fromDateTime;
    const blockEnd = request.toDateTime;

    // Bookings that overlap [blockStart, blockEnd]: pickup < blockEnd && blockStart < return
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        carId: request.carId,
        status: { in: ["PENDING", "CONFIRMED"] },
        pickupDate: { lt: blockEnd },
        returnDate: { gt: blockStart },
      },
      select: { id: true },
    });

    const conflictIds = conflictingBookings.map((b) => b.id);

    // Approve only — operational status (Upcoming → In Progress → Active) is derived from dates.
    // Do not toggle car.isAvailable here; block window is enforced via request + list status.
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const approved = await tx.carUnavailabilityRequest.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          adminNote: req.body.adminNote || null,
          updatedAt: new Date(),
        },
        include: { car: { select: { id: true, name: true } } },
      });

      if (conflictIds.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            status: "CANCELLED",
            cancellationReason: AUTO_CANCEL_REASON,
            cancelledAt: new Date(),
          },
        });
      }

      return approved;
    });

    res.status(200).json({
      message:
        conflictIds.length > 0
          ? `Block request approved. ${conflictIds.length} overlapping booking(s) were cancelled.`
          : "Block request approved.",
      data: updatedRequest,
      cancelledBookingIds: conflictIds,
      cancelledBookingsCount: conflictIds.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Error approving request", error: error.message });
  }
};

// Admin rejects → car stays available
export const rejectUnavailabilityRequest = async (req, res) => {
  try {
    const request = await prisma.carUnavailabilityRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Request is already processed" });
    }

    const updated = await prisma.carUnavailabilityRequest.update({
      where: { id: req.params.id },
      data: {
        status: "REJECTED",
        adminNote: req.body.adminNote || null,
        updatedAt: new Date(),
      },
      include: { car: { select: { name: true } } },
    });

    res.status(200).json({ message: "Request rejected.", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting request", error: error.message });
  }
};
