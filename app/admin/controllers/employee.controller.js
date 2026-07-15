import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/db.config.js";
import { generateTokens } from "../../utils/token.util.js";

export const createEmployee = async (req, res) => {
    try {
        const { name, email, phoneNum, password } = req.body;

        if (!name || !email || !phoneNum || !password) {
            return res.status(400).json({
                message: "Name, Email, Phone Number and Password are required",
            });
        }

        const existingEmployee = await prisma.admin.findFirst({
            where: {
                OR: [
                    { phoneNum },
                    { email }
                ]
            }
        });

        if (existingEmployee) {
            return res.status(400).json({
                message: "Employee already exists",
            });
        }

        // Last Employee
        const lastEmployee = await prisma.admin.findFirst({
            where: {
                role: "EMP_ADMIN",
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        let nextNumber = 1;

        if (lastEmployee?.employeeCode) {
            nextNumber =
                parseInt(lastEmployee.employeeCode.replace("EDEMP", "")) + 1;
        }

        const employeeCode = `EDEMP${String(nextNumber).padStart(4, "0")}`;

        const hashedPassword = await bcrypt.hash(password, 10);

        const employee = await prisma.admin.create({
            data: {
                employeeCode,
                name,
                email,
                phoneNum,
                password: hashedPassword,
                role: "EMP_ADMIN",
                status: "ACTIVE",
            },
        });

        res.status(201).json({
            message: "Employee created successfully",
            employee,
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating employee",
            error: error.message,
        });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const employees = await prisma.admin.findMany({
            where: {
                role: "EMP_ADMIN",
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                phoneNum: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching employees",
            error: error.message,
        });
    }
};

export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phoneNum } = req.body;

        const employee = await prisma.admin.findUnique({
            where: { id },
        });

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const updatedEmployee = await prisma.admin.update({
            where: { id },
            data: {
                name,
                phoneNum,
            },
        });

        res.status(200).json({
            message: "Employee updated successfully",
            employee: updatedEmployee,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating employee",
            error: error.message,
        });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await prisma.admin.findUnique({
            where: { id },
        });

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        await prisma.admin.delete({
            where: { id },
        });

        res.status(200).json({
            message: "Employee deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting employee",
            error: error.message,
        });
    }
};

export const updateEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({
                message: "Status must be ACTIVE or INACTIVE",
            });
        }

        const employee = await prisma.admin.findUnique({
            where: { id },
        });

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const updatedEmployee = await prisma.admin.update({
            where: { id },
            data: {
                status,
            },
        });

        res.status(200).json({
            message: "Status updated successfully",
            employee: updatedEmployee,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating status",
            error: error.message,
        });
    }
};

