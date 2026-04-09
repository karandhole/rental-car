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

function parseJsonField(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const createPartnerCar = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const images = req.files?.images?.map((f) => f.relativePath) || [];
    const documents = req.files?.documents?.map((f) => f.relativePath) || [];
    const thumbnail = req.files?.thumbnail?.[0]?.relativePath || images[0] || null;
    const features = parseJsonField(req.body.features, []);
    const specifications = parseJsonField(req.body.specifications, []);

    if (!Array.isArray(features)) {
      return res.status(400).json({ message: "features must be a JSON array" });
    }
    if (!Array.isArray(specifications)) {
      return res.status(400).json({ message: "specifications must be a JSON array" });
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
        location: req.body.location?.trim() || null,
        carNumber: req.body.carNumber?.trim() || null,
        plateNumber: req.body.plateNumber?.trim() || null,
        airBags,
        images,
        documents,
        thumbnail,
        partnerId,
      },
    });

    const pricingPayload = parseJsonField(req.body.pricing, null);
    if (Array.isArray(pricingPayload) && pricingPayload.length > 0) {
      for (const p of pricingPayload) {
        if (!p?.duration || p.price == null) continue;
        try {
          await prisma.pricing.create({
            data: {
              carId: car.id,
              duration: p.duration,
              price: Number(p.price),
            },
          });
        } catch {
          /* duplicate carId+duration */
        }
      }
    }

    const full = await prisma.car.findUnique({
      where: { id: car.id },
      include: { pricing: true },
    });

    res.status(201).json({
      message: "Car created successfully",
      data: full,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating car",
      error: error.message,
    });
  }
};

export const listPartnerCars = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const cars = await prisma.car.findMany({
      where: { partnerId },
      include: { pricing: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching cars",
      error: error.message,
    });
  }
};

export const getPartnerCar = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const car = await prisma.car.findFirst({
      where: { id: req.params.id, partnerId },
      include: { pricing: true, reviews: true },
    });

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    res.status(200).json(car);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching car",
      error: error.message,
    });
  }
};

const UPDATABLE_FIELDS = [
  "name",
  "description",
  "brand",
  "modelYear",
  "featured",
  "transmission",
  "fuelType",
  "powerType",
  "mileageKm",
  "seating",
  "color",
  "hexCode",
  "category",
  "location",
  "features",
  "specifications",
  "isAvailable",
  "ac",
  "engine",
  "brakes",
  "doors",
  "carNumber",
  "plateNumber",
  "airBags",
];

export const updatePartnerCar = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.id, partnerId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Car not found" });
    }

    const data = {};
    for (const key of UPDATABLE_FIELDS) {
      if (req.body[key] === undefined) continue;
      let v = req.body[key];
      if (key === "modelYear" || key === "mileageKm" || key === "seating" || key === "doors" || key === "airBags") {
        v = v === null || v === "" ? null : Number(v);
      }
      if (key === "featured" || key === "isAvailable") {
        v = v === true || v === "true";
      }
      if (key === "features" || key === "specifications") {
        v = typeof v === "string" ? parseJsonField(v, []) : v;
      }
      data[key] = v;
    }

    // Handle new file uploads — append to existing arrays
    if (req.files?.images?.length) {
      const newImages = req.files.images.map((f) => f.relativePath);
      data.images = [...(existing.images || []), ...newImages];
    }

    if (req.files?.documents?.length) {
      const newDocs = req.files.documents.map((f) => f.relativePath);
      data.documents = [...(existing.documents || []), ...newDocs];
    }

    if (req.files?.thumbnail?.[0]) {
      data.thumbnail = req.files.thumbnail[0].relativePath;
    }

    // Allow client to pass replacement arrays as JSON (to remove files)
    if (req.body.replaceImages) {
      data.images = parseJsonField(req.body.replaceImages, existing.images);
    }
    if (req.body.replaceDocuments) {
      data.documents = parseJsonField(req.body.replaceDocuments, existing.documents);
    }

    const car = await prisma.car.update({
      where: { id: req.params.id },
      data,
      include: { pricing: true },
    });

    res.status(200).json({
      message: "Car updated",
      data: car,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating car",
      error: error.message,
    });
  }
};

export const deletePartnerCar = async (req, res) => {
  try {
    const partnerId = requirePartner(req, res);
    if (!partnerId) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.id, partnerId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Car not found" });
    }

    await prisma.car.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Car deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting car",
      error: error.message,
    });
  }
};
