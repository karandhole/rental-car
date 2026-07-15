import prisma from "../../../lib/db.config.js";

export const startRide = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const {
            odometerKM,
            fuelPercentage,
            remark,
            rideStatus = "STARTED",
            cancelReason,
        } = req.body;

        // Booking Check
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                rideStart: true,
            },
        });

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        if (booking.rideStart) {
            return res.status(400).json({
                message: "Ride already started",
            });
        }

        // Booking must be confirmed
        if (booking.status !== "CONFIRMED") {
            return res.status(400).json({
                message: "Only confirmed booking can start ride",
            });
        }

        // Ride Status Validation
        if (!["STARTED", "HOLD", "CANCELLED"].includes(rideStatus)) {
            return res.status(400).json({
                message: "Invalid Ride Status",
            });
        }

        // Required Fields
        if (!odometerKM) {
            return res.status(400).json({
                message: "Odometer KM is required",
            });
        }

        if (fuelPercentage === undefined || fuelPercentage === null) {
            return res.status(400).json({
                message: "Fuel Percentage is required",
            });
        }

        // Uploaded Files
        const odometerImages =
            req.files?.odometerImages?.map(file => file.path) || [];

        const interiorImages =
            req.files?.interiorImages?.map(file => file.path) || [];

        const exteriorImages =
            req.files?.exteriorImages?.map(file => file.path) || [];

        const rideDocuments =
            req.files?.rideDocuments?.map(file => file.path) || [];

        const paymentProofImages =
            req.files?.paymentProofImages?.map(file => file.path) || [];

        // Validation
        if (odometerImages.length < 1) {
            return res.status(400).json({
                message: "Minimum 1 Odometer Image required",
            });
        }

        if (interiorImages.length < 2) {
            return res.status(400).json({
                message: "Minimum 2 Interior Images required",
            });
        }

        if (exteriorImages.length < 5) {
            return res.status(400).json({
                message: "Minimum 5 Exterior Images required",
            });
        }

        if (rideDocuments.length < 3) {
            return res.status(400).json({
                message: "Minimum 3 Documents required",
            });
        }

        if (paymentProofImages.length < 1) {
            return res.status(400).json({
                message: "Minimum 1 Payment Proof required",
            });
        }

        // Create Ride Start
        const ride = await prisma.rideStart.create({
            data: {
                bookingId,
                createdBy: req.admin.id,
                rideStatus,
                odometerKM: Number(odometerKM),
                fuelPercentage: Number(fuelPercentage),
                remark,
                odometerImages,
                interiorImages,
                exteriorImages,
                rideDocuments,
                paymentProofImages,
            },
        });

        // Booking Status
        let bookingData = {};

        if (rideStatus === "STARTED") {
            bookingData.status = "IN_RENTAL";
        }

        if (rideStatus === "HOLD") {
            bookingData.status = "CONFIRMED";
        }

        if (rideStatus === "CANCELLED") {
            bookingData.status = "CANCELLED";
            bookingData.cancellationReason = cancelReason || null;
            bookingData.cancelledAt = new Date();
        }

        await prisma.booking.update({
            where: {
                id: bookingId,
            },
            data: bookingData,
        });

        return res.status(201).json({
            success: true,
            message:
                rideStatus === "STARTED"
                    ? "Ride Started Successfully"
                    : rideStatus === "HOLD"
                        ? "Ride Put On Hold Successfully"
                        : "Ride Cancelled Successfully",
            ride,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const endRide = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const {
            odometerKM,
            fuelPercentage,
            remark,
            rideStatus,
        } = req.body;

        const booking = await prisma.booking.findUnique({
            where: {
                id: bookingId,
            },
            include: {
                rideStart: true,
                rideEnd: true,
            },
        });

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        if (!booking.rideStart) {
            return res.status(400).json({
                message: "Ride has not started",
            });
        }

        if (booking.rideEnd) {
            return res.status(400).json({
                message: "Ride already ended",
            });
        }

        if (booking.status !== "IN_RENTAL") {
            return res.status(400).json({
                message: "Ride is not in progress",
            });
        }

        if (!odometerKM) {
            return res.status(400).json({
                message: "Odometer KM is required",
            });
        }

        if (fuelPercentage === undefined || fuelPercentage === null) {
            return res.status(400).json({
                message: "Fuel Percentage is required",
            });
        }
        if (!["COMPLETED", "HOLD"].includes(rideStatus)) {
            return res.status(400).json({
                message: "Invalid Ride Status",
            });
        }

        const odometerImages =
            req.files?.odometerImages?.map(file => file.path) || [];

        const interiorImages =
            req.files?.interiorImages?.map(file => file.path) || [];

        const exteriorImages =
            req.files?.exteriorImages?.map(file => file.path) || [];

        if (odometerImages.length < 1) {
            return res.status(400).json({
                message: "Minimum 1 Odometer Image required",
            });
        }

        if (interiorImages.length < 2) {
            return res.status(400).json({
                message: "Minimum 2 Interior Images required",
            });
        }

        if (exteriorImages.length < 5) {
            return res.status(400).json({
                message: "Minimum 5 Exterior Images required",
            });
        }

        const rideEnd = await prisma.rideEnd.create({
            data: {
                bookingId,
                createdBy: req.admin.id,
                rideStatus,
                odometerKM: Number(odometerKM),
                fuelPercentage: Number(fuelPercentage),
                remark,
                odometerImages,
                interiorImages,
                exteriorImages,
            },
        });

        let bookingStatus = "COMPLETED";

        if (rideStatus === "HOLD") {
            bookingStatus = "IN_RENTAL";
        }

        await prisma.booking.update({
            where: {
                id: bookingId,
            },
            data: {
                status: bookingStatus,
            },
        });
        if (rideStatus === "COMPLETED") {
            await prisma.car.update({
                where: {
                    id: booking.carId,
                },
                data: {
                    isAvailable: true,
                },
            });
        }
        return res.status(200).json({
            success: true,
            message:
                rideStatus === "COMPLETED"
                    ? "Ride Ended Successfully"
                    : "Ride Put On Hold Successfully",
            rideEnd,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

