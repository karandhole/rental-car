import prisma from "../../../lib/db.config.js";

export const getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.carPartner.id;

    // --- Fetch partner info ---
    const partner = await prisma.carPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, phoneNum: true, email: true },
    });

    // --- Fetch all cars for this partner ---
    const cars = await prisma.car.findMany({
      where: { partnerId },
      select: {
        id: true,
        name: true,
        images: true,
        category: true,
        brand: true,
        isAvailable: true,
        bookings: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
          },
        },
      },
    });

    const carIds = cars.map((c) => c.id);
    const totalCars = cars.length;

    // --- Fetch all bookings for partner's cars ---
    const allBookings = await prisma.booking.findMany({
      where: { car: { partnerId } },
      include: {
        car: { select: { id: true, name: true, images: true, category: true } },
        user: { select: { firstName: true, lastName: true } },
        pricing: { select: { price: true, duration: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReservations = allBookings.length;

    // Bookings in current week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(startOfWeek);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const reservationsThisWeek = allBookings.filter(
      (b) => new Date(b.createdAt) >= startOfWeek
    ).length;
    const reservationsPrevWeek = allBookings.filter(
      (b) =>
        new Date(b.createdAt) >= prevWeekStart &&
        new Date(b.createdAt) < startOfWeek
    ).length;

    const reservationChange =
      reservationsPrevWeek > 0
        ? Math.round(
            ((reservationsThisWeek - reservationsPrevWeek) /
              reservationsPrevWeek) *
              100
          )
        : reservationsThisWeek > 0 ? 100 : 0;

    // --- Earnings ---
    const completedBookings = allBookings.filter(
      (b) => b.status === "COMPLETED" || b.status === "CONFIRMED"
    );
    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + (b.totalPrice || 0),
      0
    );

    const earningsThisWeek = allBookings
      .filter(
        (b) =>
          new Date(b.createdAt) >= startOfWeek &&
          (b.status === "COMPLETED" || b.status === "CONFIRMED")
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const earningsPrevWeek = allBookings
      .filter(
        (b) =>
          new Date(b.createdAt) >= prevWeekStart &&
          new Date(b.createdAt) < startOfWeek &&
          (b.status === "COMPLETED" || b.status === "CONFIRMED")
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const earningsChange =
      earningsPrevWeek > 0
        ? Math.round(
            ((earningsThisWeek - earningsPrevWeek) / earningsPrevWeek) * 100
          )
        : earningsThisWeek > 0 ? 100 : 0;

    // --- In Rental / Upcoming ---
    const inRental = allBookings.filter((b) => b.status === "CONFIRMED").length;
    const upcoming = allBookings.filter((b) => b.status === "PENDING").length;

    // --- Recent Reservations (last 5) ---
    const recentReservations = allBookings.slice(0, 5).map((b) => ({
      id: b.id,
      carName: b.car?.name || "Unknown",
      carImage: b.car?.images?.[0] || "",
      carCategory: b.car?.category || "",
      customerName: `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim(),
      pickupDate: b.pickupDate,
      returnDate: b.returnDate,
      totalPrice: b.totalPrice,
      status: b.status,
      duration: b.duration,
      bookingType: b.bookingType,
      deliveryAddress: b.deliveryAddress,
      returnAddress: b.returnAddress,
    }));

    // --- Top Cars by Booking Count ---
    const carBookingMap = {};
    allBookings.forEach((b) => {
      if (!carBookingMap[b.carId]) {
        carBookingMap[b.carId] = {
          car: b.car,
          count: 0,
        };
      }
      carBookingMap[b.carId].count++;
    });

    const topCars = Object.values(carBookingMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((entry) => ({
        id: entry.car.id,
        name: entry.car.name,
        image: entry.car.images?.[0] || "",
        category: entry.car.category || "",
        bookingCount: entry.count,
      }));

    // --- Income chart: last 7 days ---
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const incomeByDay = [];
    const incomeCategories = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = allBookings
        .filter((b) => {
          const created = new Date(b.createdAt);
          return (
            created >= dayStart &&
            created <= dayEnd &&
            (b.status === "COMPLETED" || b.status === "CONFIRMED")
          );
        })
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      incomeByDay.push(dayIncome);
      incomeCategories.push(
        dayStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      );
    }

    // --- Newest Car ---
    const newestCar = cars.length > 0 ? cars[cars.length - 1] : null;

    res.status(200).json({
      partner,
      stats: {
        totalCars,
        totalReservations,
        totalEarnings,
        earningsThisWeek,
        earningsChange,
        reservationsThisWeek,
        reservationChange,
        inRental,
        upcoming,
      },
      recentReservations,
      topCars,
      incomeChart: {
        categories: incomeCategories,
        data: incomeByDay,
      },
      newestCar: newestCar
        ? {
            id: newestCar.id,
            name: newestCar.name,
            image: newestCar.images?.[0] || "",
            category: newestCar.category || "",
            isAvailable: newestCar.isAvailable,
          }
        : null,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: error.message });
  }
};
