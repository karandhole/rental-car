import prisma from "../../../lib/db.config.js";

function requirePartner(req, res) {
  const id = req.carPartner?.id;
  const role = req.carPartner?.role;
  if (!id || role !== "CAR_PARTNER") {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  return id;
}

// Car partner creates an unavailability request
export const createUnavailabilityRequest = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const { carId, fromDateTime, toDateTime, reason } = req.body;

    if (!carId || !fromDateTime || !toDateTime) {
      return res.status(400).json({ message: "carId, fromDateTime and toDateTime are required" });
    }

    // Verify the car belongs to this partner
    const car = await prisma.car.findFirst({ where: { id: carId, partnerId } });
    if (!car) return res.status(404).json({ message: "Car not found" });

    // Check for an existing PENDING request for the same car
    const existing = await prisma.carUnavailabilityRequest.findFirst({
      where: { carId, status: "PENDING" },
    });
    if (existing) {
      return res.status(409).json({
        message: "A pending unavailability request already exists for this car.",
      });
    }

    const request = await prisma.carUnavailabilityRequest.create({
      data: {
        carId,
        partnerId,
        fromDateTime: new Date(fromDateTime),
        toDateTime: new Date(toDateTime),
        reason: reason || null,
        status: "PENDING",
      },
      include: { car: { select: { name: true } } },
    });

    res.status(201).json({
      message: "Unavailability request submitted. Awaiting admin approval.",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating request", error: error.message });
  }
};

// Car partner lists their own requests
export const listMyUnavailabilityRequests = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const requests = await prisma.carUnavailabilityRequest.findMany({
      where: { partnerId },
      include: { car: { select: { id: true, name: true, thumbnail: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching requests", error: error.message });
  }
};

// Car partner cancels their own PENDING request
export const cancelUnavailabilityRequest = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const request = await prisma.carUnavailabilityRequest.findFirst({
      where: { id: req.params.id, partnerId },
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Only PENDING requests can be cancelled" });
    }

    await prisma.carUnavailabilityRequest.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Request cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling request", error: error.message });
  }
};
