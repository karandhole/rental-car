import prisma from "../../../lib/db.config.js";

// Get all reservations for the logged-in Car Partner
export const getReservations = async (req, res) => {
    try {
        const partnerId = req.carPartner.id;

        // Find all bookings where the reserved Car belongs to this partner
        console.log(partnerId)
        const bookings = await prisma.booking.findMany({
            where: {
                car: {
                    partnerId: partnerId,
                },
            },

            include: {
                car: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        color: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNum: true,
                    },
                },
                pricing: true,
                payment: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching partner reservations:", error);
        res.status(500).json({ message: error.message });
    }
};

// Get a specific reservation's full details for the logged-in Car Partner
export const getReservationById = async (req, res) => {
    try {
        const { id } = req.params;
        const partnerId = req.carPartner.id;

        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                car: true, // we might need more details for the detail view
                user: true, // Need full customer details (driving license, etc.)
                pricing: true,
                payment: true,
            },
        });

        if (!booking) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        // Authorization check: Ensure this booking actually belongs to a car owned by this partner
        if (booking.car.partnerId !== partnerId) {
            return res.status(403).json({ message: "Unauthorized access to this reservation" });
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error("Error fetching reservation details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
