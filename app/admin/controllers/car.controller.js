import prisma from "../../../lib/db.config.js";

function parseJsonField(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Admin list status — independent of verification.
 * Partner block request PENDING → Pending.
 * Approved before window → Upcoming; during window → In Progress; after → Active (unless manual inactive).
 */
function computeCarOperationalStatus(car, requests, now = new Date()) {
  const t = now.getTime();
  const list = Array.isArray(requests) ? requests : [];

  const pending = list.find((r) => r.status === "PENDING");
  if (pending) return "Pending";

  const approved = list.filter((r) => r.status === "APPROVED");
  const inProgress = approved.find((r) => {
    const from = new Date(r.fromDateTime).getTime();
    const to = new Date(r.toDateTime).getTime();
    return t >= from && t <= to;
  });
  if (inProgress) return "In Progress";

  const future = approved
    .filter((r) => new Date(r.fromDateTime).getTime() > t)
    .sort((a, b) => new Date(a.fromDateTime) - new Date(b.fromDateTime));
  if (future.length) return "Upcoming";

  if (car.isAvailable === false) return "Inactive";
  return "Active";
}

// ─── Create Car ───────────────────────────────────────────────────────────────
export const createAdminCar = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(403).json({ message: "Forbidden" });

    const images = req.files?.images?.map((f) => f.relativePath) || [];
    const documents = req.files?.documents?.map((f) => f.relativePath) || [];
    const thumbnail = req.files?.thumbnail?.[0]?.relativePath || images[0] || null;
    const features = parseJsonField(req.body.features, []);
    const specifications = parseJsonField(req.body.specifications, []);

    // Owner assignment: admin or carPartner
    const ownerType = req.body.ownerType || "admin"; // "admin" | "carPartner"
    const selectedOwnerId = req.body.selectedOwnerId || null;

    let ownerFields = { adminId };
    if (ownerType === "carPartner" && selectedOwnerId) {
      ownerFields = { partnerId: selectedOwnerId };
    }

    const airBagsRaw = req.body.airBags;
    const airBags =
      airBagsRaw === "" || airBagsRaw == null
        ? null
        : Number.isFinite(Number(airBagsRaw))
          ? Math.floor(Number(airBagsRaw))
          : null;

    const car = await prisma.car.create({
      data: {
        name: req.body.name,
        brand: req.body.brand || "",
        modelYear: Number(req.body.modelYear) || new Date().getFullYear(),
        featured: req.body.featured === "true" || req.body.featured === true,
        transmission: req.body.transmission || "AUTO",
        fuelType: req.body.fuelType || "PETROL",
        powerType: req.body.powerType || "POWER",
        description: req.body.description || "",
        features,
        specifications,
        mileageKm: Number(req.body.mileageKm) || 0,
        seating: Number(req.body.seating) || 4,
        color: req.body.color || "White",
        hexCode: req.body.hexCode || "#FFFFFF",
        category: req.body.category || null,
        location: req.body.location || null,
        carNumber: req.body.carNumber?.trim() || null,
        plateNumber: req.body.plateNumber?.trim() || null,
        airBags,
        images,
        documents,
        thumbnail,
        isVerified: true,
        ...ownerFields,
      },
    });

    // Create pricing entries
    const pricingPayload = parseJsonField(req.body.pricing, null);
    if (Array.isArray(pricingPayload) && pricingPayload.length > 0) {
      for (const p of pricingPayload) {
        if (!p?.duration || p.price == null) continue;
        try {
          await prisma.pricing.create({
            data: { carId: car.id, duration: p.duration, price: Number(p.price) },
          });
        } catch {
          /* skip duplicate */
        }
      }
    }

    // Create seasonal pricing entries
    const seasonalPayload = parseJsonField(req.body.seasonalPricing, null);
    if (Array.isArray(seasonalPayload) && seasonalPayload.length > 0) {
      for (const s of seasonalPayload) {
        if (!s?.name || !s?.startDate || !s?.endDate) continue;
        try {
          await prisma.seasonalPricing.create({
            data: {
              carId: car.id,
              name: s.name,
              startDate: new Date(s.startDate),
              endDate: new Date(s.endDate),
              hourPrice: s.hourPrice != null ? parseFloat(s.hourPrice) : null,
              dayPrice: s.dayPrice != null ? parseFloat(s.dayPrice) : null,
              weekPrice: s.weekPrice != null ? parseFloat(s.weekPrice) : null,
              monthPrice: s.monthPrice != null ? parseFloat(s.monthPrice) : null,
              isActive: true,
            },
          });
        } catch {
          /* skip */
        }
      }
    }

    const full = await prisma.car.findUnique({
      where: { id: car.id },
      include: { pricing: true, seasonalPricing: true },
    });

    res.status(201).json({ message: "Car created successfully", data: full });
  } catch (error) {
    res.status(500).json({ message: "Error creating car", error: error.message });
  }
};

// ─── List All Cars ────────────────────────────────────────────────────────────
export const listAdminCars = async (req, res) => {
  try {
    const now = new Date();
    const cars = await prisma.car.findMany({
      include: {
        pricing: true,
        seasonalPricing: true,
        partner: { select: { id: true, name: true, phoneNum: true } },
        admin: { select: { id: true, name: true } },
        unavailabilityRequests: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = cars.map((car) => {
      const reqs = car.unavailabilityRequests || [];
      const operationalStatus = computeCarOperationalStatus(car, reqs, now);
      const pending = reqs.find((r) => r.status === "PENDING");
      return {
        ...car,
        operationalStatus,
        pendingUnavailability: pending
          ? {
              id: pending.id,
              reason: pending.reason,
              fromDateTime: pending.fromDateTime,
              toDateTime: pending.toDateTime,
            }
          : null,
      };
    });

    res.status(200).json({ count: data.length, data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cars", error: error.message });
  }
};

// ─── Get Single Car ───────────────────────────────────────────────────────────
export const getAdminCar = async (req, res) => {
  try {
    const now = new Date();
    const car = await prisma.car.findUnique({
      where: { id: req.params.id },
      include: {
        pricing: true,
        seasonalPricing: true,
        reviews: { include: { user: { select: { firstName: true, lastName: true } } } },
        partner: { select: { id: true, name: true, phoneNum: true } },
        admin: { select: { id: true, name: true } },
        unavailabilityRequests: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!car) return res.status(404).json({ message: "Car not found" });
    const reqs = car.unavailabilityRequests || [];
    const operationalStatus = computeCarOperationalStatus(car, reqs, now);
    const pending = reqs.find((r) => r.status === "PENDING");
    res.status(200).json({
      data: {
        ...car,
        operationalStatus,
        pendingUnavailability: pending
          ? {
              id: pending.id,
              reason: pending.reason,
              fromDateTime: pending.fromDateTime,
              toDateTime: pending.toDateTime,
            }
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching car", error: error.message });
  }
};

// ─── Update Car ───────────────────────────────────────────────────────────────
const UPDATABLE_FIELDS = [
  "name", "description", "brand", "modelYear", "featured",
  "transmission", "fuelType", "powerType", "mileageKm",
  "seating", "color", "hexCode", "category", "location", "features",
  "specifications", "isAvailable", "isVerified", "ac", "engine", "brakes", "doors",
  "carNumber", "plateNumber", "airBags",
];

export const updateAdminCar = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(403).json({ message: "Forbidden" });

    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Car not found" });

    const data = {};
    for (const key of UPDATABLE_FIELDS) {
      if (req.body[key] === undefined) continue;
      let v = req.body[key];
      if (["modelYear", "mileageKm", "seating", "doors", "airBags"].includes(key)) {
        v = v === null || v === "" ? null : Number(v);
      }
      if (["featured", "isAvailable", "isVerified"].includes(key)) {
        v = v === true || v === "true";
      }
      if (["features", "specifications"].includes(key)) {
        v = typeof v === "string" ? parseJsonField(v, []) : v;
      }
      data[key] = v;
    }

    // Owner change
    const ownerType = req.body.ownerType;
    const selectedOwnerId = req.body.selectedOwnerId;
    if (ownerType === "carPartner" && selectedOwnerId) {
      data.partnerId = selectedOwnerId;
      data.adminId = null;
    } else if (ownerType === "admin") {
      data.adminId = adminId;
      data.partnerId = null;
    }

    // File uploads — append
    if (req.files?.images?.length) {
      data.images = [...(existing.images || []), ...req.files.images.map((f) => f.relativePath)];
    }
    if (req.files?.documents?.length) {
      data.documents = [...(existing.documents || []), ...req.files.documents.map((f) => f.relativePath)];
    }
    if (req.files?.thumbnail?.[0]) {
      data.thumbnail = req.files.thumbnail[0].relativePath;
    }

    // Allow client to send replacement arrays (to remove files)
    if (req.body.replaceImages) {
      data.images = parseJsonField(req.body.replaceImages, existing.images);
    }
    if (req.body.replaceDocuments) {
      data.documents = parseJsonField(req.body.replaceDocuments, existing.documents);
    }

    const carId = req.params.id;

    const car = await prisma.$transaction(async (tx) => {
      await tx.car.update({
        where: { id: carId },
        data,
      });

      // Base pricing: upsert by (carId, duration) so existing Pricing rows / booking FKs stay valid
      const pricingPayload = parseJsonField(req.body.pricing, null);
      if (Array.isArray(pricingPayload)) {
        for (const p of pricingPayload) {
          if (!p?.duration) continue;
          if (p.price === "" || p.price == null) continue;
          const price = Math.round(Number(p.price));
          if (!Number.isFinite(price)) continue;
          const row = await tx.pricing.findFirst({
            where: { carId, duration: p.duration },
          });
          if (row) {
            await tx.pricing.update({
              where: { id: row.id },
              data: { price },
            });
          } else {
            await tx.pricing.create({
              data: { carId, duration: p.duration, price },
            });
          }
        }
      }

      // Seasonal pricing: replace set when client sends seasonalPricing (same as create semantics)
      if (
        req.body.seasonalPricing !== undefined &&
        req.body.seasonalPricing !== null &&
        String(req.body.seasonalPricing).trim() !== ""
      ) {
        const seasonalPayload = parseJsonField(req.body.seasonalPricing, []);
        if (Array.isArray(seasonalPayload)) {
          await tx.seasonalPricing.deleteMany({ where: { carId } });
          for (const s of seasonalPayload) {
            if (!s?.name || !s?.startDate || !s?.endDate) continue;
            await tx.seasonalPricing.create({
              data: {
                carId,
                name: s.name,
                startDate: new Date(s.startDate),
                endDate: new Date(s.endDate),
                hourPrice: s.hourPrice != null && s.hourPrice !== "" ? parseFloat(String(s.hourPrice)) : null,
                dayPrice: s.dayPrice != null && s.dayPrice !== "" ? parseFloat(String(s.dayPrice)) : null,
                weekPrice: s.weekPrice != null && s.weekPrice !== "" ? parseFloat(String(s.weekPrice)) : null,
                monthPrice: s.monthPrice != null && s.monthPrice !== "" ? parseFloat(String(s.monthPrice)) : null,
                isActive: true,
              },
            });
          }
        }
      }

      return tx.car.findUnique({
        where: { id: carId },
        include: { pricing: true, seasonalPricing: true },
      });
    });

    res.status(200).json({ message: "Car updated", data: car });
  } catch (error) {
    res.status(500).json({ message: "Error updating car", error: error.message });
  }
};

// ─── Delete Car ───────────────────────────────────────────────────────────────
export const deleteAdminCar = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(403).json({ message: "Forbidden" });

    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Car not found" });

    await prisma.car.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Car deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting car", error: error.message });
  }
};

// ─── Toggle Availability ──────────────────────────────────────────────────────
export const toggleCarAvailability = async (req, res) => {
  try {
    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Car not found" });

    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: { isAvailable: !existing.isAvailable },
    });

    res.status(200).json({ message: "Availability updated", data: car });
  } catch (error) {
    res.status(500).json({ message: "Error toggling availability", error: error.message });
  }
};

// ─── Toggle Verification ──────────────────────────────────────────────────────
export const toggleCarVerification = async (req, res) => {
  try {
    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Car not found" });

    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: { isVerified: !existing.isVerified },
    });

    res.status(200).json({ message: "Verification updated", isVerified: car.isVerified, data: car });
  } catch (error) {
    res.status(500).json({ message: "Error toggling verification", error: error.message });
  }
};
