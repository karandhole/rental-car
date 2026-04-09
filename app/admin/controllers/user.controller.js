import prisma from "../../../lib/db.config.js";

// Get All Users
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get Single User
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            car: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reviews: {
          include: {
            car: true
          }
        },
        address: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// Toggle User Block Status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isBlocked: !user.isBlocked }
    });

    res.status(200).json({
      message: `User ${updatedUser.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};