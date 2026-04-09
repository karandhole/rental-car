import prisma from "../../../lib/db.config.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getAllCarPartner = async (req, res) => {
    try {
        const carPartners = await prisma.carPartner.findMany({
            include: {
                _count: {
                    select: { cars: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(carPartners);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching car partners",
            error
        });
    }
};

const ALLOWED_CAR_PARTNER_STATUS = ["Active", "Inactive"];

export const updateCarPartnerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!status || !ALLOWED_CAR_PARTNER_STATUS.includes(status)) {
            return res.status(400).json({
                message: `status must be one of: ${ALLOWED_CAR_PARTNER_STATUS.join(", ")}`,
            });
        }
        const updated = await prisma.carPartner.update({
            where: { id },
            data: { status },
            include: {
                _count: {
                    select: { cars: true },
                },
            },
        });
        res.status(200).json(updated);
    } catch (error) {
        if (error?.code === "P2025") {
            return res.status(404).json({ message: "Car partner not found" });
        }
        res.status(500).json({
            message: "Error updating car partner status",
            error: error?.message || String(error),
        });
    }
};

/** Admin: update partner profile fields (phone is immutable). */
export const updateCarPartnerByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, address } = req.body || {};

        if (name === undefined || !String(name).trim()) {
            return res.status(400).json({ message: "Name is required" });
        }
        if (email === undefined || !String(email).trim()) {
            return res.status(400).json({ message: "Email is required" });
        }
        const emailTrim = String(email).trim();
        if (!EMAIL_REGEX.test(emailTrim)) {
            return res.status(400).json({ message: "Invalid email address" });
        }

        const addressNorm =
            address === undefined || address === null || !String(address).trim()
                ? null
                : String(address).trim();

        const updated = await prisma.carPartner.update({
            where: { id },
            data: {
                name: String(name).trim(),
                email: emailTrim,
                address: addressNorm,
            },
            include: {
                _count: {
                    select: { cars: true },
                },
            },
        });
        res.status(200).json(updated);
    } catch (error) {
        if (error?.code === "P2025") {
            return res.status(404).json({ message: "Car partner not found" });
        }
        res.status(500).json({
            message: "Error updating car partner",
            error: error?.message || String(error),
        });
    }
};