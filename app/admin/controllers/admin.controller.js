import prisma from "../../../lib/db.config.js";

export const getAdmin = async (req, res) => {
    try {
        const id = req.admin.id;

        const admin = await prisma.admin.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                name: true,
                phoneNum: true,
            },
        });

        if (!admin) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }

        res.status(200).json({
            success: true,
            admin,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching admin",
            error: error.message,
        });
    }
};

export const updateAdmin = async (req, res) => {
    try {
        const id = req.admin.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        const admin = await prisma.admin.update({
            where: {
                id: id,
            },
            data: {
                name: name,
            },
            select: {
                id: true,
                name: true,
                phoneNum: true,
            },
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            admin,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating admin profile",
            error: error.message,
        });
    }
};