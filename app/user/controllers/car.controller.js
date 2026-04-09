import prisma from "../../../lib/db.config.js";
import {
  BOOKING_BUFFER_MS,
  bookingBlocksOverlapSearch,
  expandRangeWithBuffer,
  parseRentalWindow,
} from "../../utils/bookingAvailability.js";

const BLOCKING_BOOKING_STATUSES = ["PENDING", "CONFIRMED"];

function buildAvailabilityPayload(bookings, unavailabilityRows) {
  const blocks = [];

  for (const b of bookings) {
    const buf = expandRangeWithBuffer(b.pickupDate, b.returnDate);
    blocks.push({
      kind: "BOOKING",
      status: "booked",
      pickupAt: b.pickupDate.toISOString(),
      returnAt: b.returnDate.toISOString(),
      blockedFrom: buf.start.toISOString(),
      blockedTo: buf.end.toISOString(),
    });
  }

  for (const u of unavailabilityRows) {
    const buf = expandRangeWithBuffer(u.fromDateTime, u.toDateTime);
    blocks.push({
      kind: "BLOCKED",
      status: "blocked",
      pickupAt: u.fromDateTime.toISOString(),
      returnAt: u.toDateTime.toISOString(),
      blockedFrom: buf.start.toISOString(),
      blockedTo: buf.end.toISOString(),
    });
  }

  return {
    bufferHours: BOOKING_BUFFER_MS / (60 * 60 * 1000),
    blocks,
  };
}
/**
 * CREATE CAR
 */
export const createCar = async (req, res) => {
  try {
    const images = req.files?.images?.map(f => f.relativePath) || [];
    const thumbnail = req.files?.thumbnail?.[0]?.relativePath || null;
    const features = JSON.parse(req.body.features);
    const specifications = JSON.parse(req.body.specifications);

    console.log(req.body)

    const car = await prisma.car.create({
      data: {
        name: req.body.name,
        brand: req.body.brand,
        modelYear: Number(req.body.modelYear),
        featured: req.body.featured === "true",

        transmission: req.body.transmission, // enum string is OK
        fuelType: req.body.fuelType,
        powerType: req.body.powerType,
        description:req.body.description,
        features,
        specifications,
        mileageKm: Number(req.body.mileageKm),
        seating: Number(req.body.seating),
        color:req.body.color,
        hexCode:req.body.hexCode,
        images: images,
        thumbnail: thumbnail,
      },
    });


    res.status(201).json({
      message: "Car created successfully",
      data: car,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating car",
      error: error.message,
    });
  }
};

/** Bookings that count toward “popularity” (excludes cancelled only). */
const POPULAR_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"];

/**
 * Top verified cars by booking volume, with aggregate review stats for the home grid.
 */
export const getPopularCars = async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 24) : 6;

    const cars = await prisma.car.findMany({
      where: { isVerified: true },
      include: {
        pricing: true,
        reviews: { select: { rating: true } },
        _count: {
          select: {
            bookings: {
              where: { status: { in: POPULAR_BOOKING_STATUSES } },
            },
          },
        },
      },
    });

    const scored = cars.map((car) => {
      const bookingCount = car._count.bookings;
      const reviewCount = car.reviews.length;
      const averageRating =
        reviewCount > 0
          ? Math.round(
              (car.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) *
                10
            ) / 10
          : null;
      return { car, bookingCount, averageRating, reviewCount };
    });

    scored.sort((a, b) => {
      if (b.bookingCount !== a.bookingCount) {
        return b.bookingCount - a.bookingCount;
      }
      const arA = a.averageRating ?? 0;
      const arB = b.averageRating ?? 0;
      if (arB !== arA) return arB - arA;
      return b.reviewCount - a.reviewCount;
    });

    const data = scored.slice(0, limit).map(({ car, bookingCount, averageRating, reviewCount }) => {
      const { reviews, _count, ...rest } = car;
      return {
        ...rest,
        bookingCount,
        averageRating,
        reviewCount,
      };
    });

    res.status(200).json({ count: data.length, data });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching popular cars",
      error: error.message,
    });
  }
};

/**
 * GET ALL CARS
 */
export const getAllCars = async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      where: { isVerified: true },
      include: {
        pricing: true,
        reviews: true,
      },
    });

    const window = parseRentalWindow(req.query.pickup, req.query.returnAt);

    if (!window) {
      return res.status(200).json({
        count: cars.length,
        data: cars,
        meta: {
          bookingBufferHours: BOOKING_BUFFER_MS / (60 * 60 * 1000),
          searchApplied: false,
        },
      });
    }

    const margin = 2 * BOOKING_BUFFER_MS;

    const [bookings, unavailabilityRows] = await Promise.all([
      prisma.booking.findMany({
        where: {
          status: { in: BLOCKING_BOOKING_STATUSES },
          returnDate: { gte: new Date(window.pickup.getTime() - margin) },
          pickupDate: { lte: new Date(window.return.getTime() + margin) },
        },
        select: { carId: true, pickupDate: true, returnDate: true },
      }),
      prisma.carUnavailabilityRequest.findMany({
        where: {
          status: "APPROVED",
          toDateTime: { gte: new Date(window.pickup.getTime() - margin) },
          fromDateTime: { lte: new Date(window.return.getTime() + margin) },
        },
        select: { carId: true, fromDateTime: true, toDateTime: true },
      }),
    ]);

    const busyCarIds = new Set();

    for (const b of bookings) {
      if (
        bookingBlocksOverlapSearch(
          b.pickupDate,
          b.returnDate,
          window.pickup,
          window.return
        )
      ) {
        busyCarIds.add(b.carId);
      }
    }

    for (const u of unavailabilityRows) {
      if (
        bookingBlocksOverlapSearch(
          u.fromDateTime,
          u.toDateTime,
          window.pickup,
          window.return
        )
      ) {
        busyCarIds.add(u.carId);
      }
    }

    const data = cars.map((c) => ({
      ...c,
      isUnavailableForSearch: busyCarIds.has(c.id),
    }));

    res.status(200).json({
      count: data.length,
      data,
      meta: {
        bookingBufferHours: BOOKING_BUFFER_MS / (60 * 60 * 1000),
        searchApplied: true,
        searchWindow: {
          pickup: window.pickup.toISOString(),
          returnAt: window.return.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching cars",
      error: error.message,
    });
  }
};

/**
 * GET CAR BY ID
 */
export const getCarById = async (req, res) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id },
      include: {
        pricing: true,
        reviews: true,
        bookings: {
          where: { status: { in: BLOCKING_BOOKING_STATUSES } },
          select: { pickupDate: true, returnDate: true },
        },
        unavailabilityRequests: {
          where: { status: "APPROVED" },
          select: { fromDateTime: true, toDateTime: true },
        },
      },
    });

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    if (!car.isVerified) {
      return res.status(404).json({ message: "Car not found" });
    }

    const { bookings, unavailabilityRequests, ...rest } = car;
    const availability = buildAvailabilityPayload(bookings, unavailabilityRequests);

    res.status(200).json({
      ...rest,
      availability,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching car",
      error: error.message,
    });
  }
};

/**
 * PUT UPDATE
 */
export const updateCar = async (req, res) => {
  try {
    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: req.body,
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

/**
 * PATCH UPDATE
 */
export const patchCar = async (req, res) => {
  try {
    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.status(200).json({
      message: "Car patched",
      data: car,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error patching car",
      error: error.message,
    });
  }
};

/**
 * DELETE CAR
 */
export const deleteCar = async (req, res) => {
  try {
    await prisma.car.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: "Car deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting car",
      error: error.message,
    });
  }
};