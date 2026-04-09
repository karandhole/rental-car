import prisma from "../../../lib/db.config.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function percentChange(current, previous) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100);
  return current > 0 ? 100 : 0;
}

/** Last 7 calendar days as { start, end, label } oldest → newest */
function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const start = startOfDay(day);
    const end = endOfDay(day);
    const label = `${String(day.getDate()).padStart(2, "0")} ${day.toLocaleString("en", { month: "short" })}`;
    out.push({ start, end, label, date: day });
  }
  return out;
}

function last7MonthsBuckets() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleString("en", { month: "short" });
    out.push({ start, end, label });
  }
  return out;
}

export const getAdminDashboard = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const admin = adminId
      ? await prisma.admin.findUnique({
          where: { id: adminId },
          select: { name: true, phoneNum: true },
        })
      : null;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(startOfWeek);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(startOfWeek.getTime() - 1);

    const [
      totalCars,
      totalUsers,
      totalBookings,
      inRental,
      upcoming,
      allBookings,
      cars,
      payments,
      usersWithCounts,
    ] = await Promise.all([
      prisma.car.count(),
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.count({
        where: {
          status: "CONFIRMED",
          pickupDate: { lte: now },
          returnDate: { gte: now },
        },
      }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.findMany({
        include: {
          car: { select: { id: true, name: true, thumbnail: true, images: true, category: true } },
          user: { select: { id: true, firstName: true, lastName: true, phoneNum: true, email: true } },
          pricing: { select: { price: true, duration: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.car.findMany({
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { pricing: true },
      }),
      prisma.payment.findMany({
        where: { status: "SUCCESS" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          booking: {
            select: { id: true, returnDate: true, totalPrice: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.user.findMany({
        take: 200,
        include: {
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    const revenueBookings = allBookings.filter((b) =>
      ["COMPLETED", "CONFIRMED"].includes(b.status)
    );
    const totalEarnings = revenueBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

    const bookingsThisWeek = allBookings.filter((b) => new Date(b.createdAt) >= startOfWeek);
    const bookingsPrevWeek = allBookings.filter(
      (b) => new Date(b.createdAt) >= prevWeekStart && new Date(b.createdAt) <= prevWeekEnd
    );

    const earningsThisWeek = bookingsThisWeek
      .filter((b) => ["COMPLETED", "CONFIRMED"].includes(b.status))
      .reduce((s, b) => s + (b.totalPrice || 0), 0);
    const earningsPrevWeek = bookingsPrevWeek
      .filter((b) => ["COMPLETED", "CONFIRMED"].includes(b.status))
      .reduce((s, b) => s + (b.totalPrice || 0), 0);

    const carsThisWeek = await prisma.car.count({
      where: { createdAt: { gte: startOfWeek } },
    });
    const carsPrevWeek = await prisma.car.count({
      where: {
        createdAt: { gte: prevWeekStart, lte: prevWeekEnd },
      },
    });

    const dayBuckets = last7Days();
    const sparkReservations = dayBuckets.map(
      (bucket) =>
        allBookings.filter((b) => {
          const t = new Date(b.createdAt);
          return t >= bucket.start && t <= bucket.end;
        }).length
    );
    const sparkEarnings = dayBuckets.map((bucket) =>
      allBookings
        .filter((b) => {
          const t = new Date(b.createdAt);
          return (
            t >= bucket.start &&
            t <= bucket.end &&
            ["COMPLETED", "CONFIRMED"].includes(b.status)
          );
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0)
    );
    const sparkCars = await Promise.all(
      dayBuckets.map((bucket) =>
        prisma.car.count({
          where: {
            createdAt: { gte: bucket.start, lte: bucket.end },
          },
        })
      )
    );

    const monthBuckets = last7MonthsBuckets();
    const sparkReservationsMonth = monthBuckets.map(
      (bucket) =>
        allBookings.filter((b) => {
          const t = new Date(b.createdAt);
          return t >= bucket.start && t <= bucket.end;
        }).length
    );

    const incomeByDay = dayBuckets.map((bucket) =>
      allBookings
        .filter((b) => {
          const t = new Date(b.createdAt);
          return (
            t >= bucket.start &&
            t <= bucket.end &&
            ["COMPLETED", "CONFIRMED"].includes(b.status)
          );
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0)
    );
    const expenseByDay = incomeByDay.map((inc) => -Math.max(1, Math.round(inc * 0.12)));

    const prevWeekIncome = bookingsPrevWeek
      .filter((b) => ["COMPLETED", "CONFIRMED"].includes(b.status))
      .reduce((s, b) => s + (b.totalPrice || 0), 0);
    const prevWeekExpense = -Math.max(1, Math.round(prevWeekIncome * 0.12));

    const incomeThisWeekRounded = Math.round(earningsThisWeek);
    const expenseThisWeek = -Math.max(1, Math.round(incomeThisWeekRounded * 0.12));

    const newlyAdded = cars[0] || null;
    const dayPrice =
      newlyAdded?.pricing?.find((p) => p.duration === "DAY")?.price ??
      newlyAdded?.pricing?.[0]?.price ??
      null;

    const recentBookings = allBookings.slice(0, 5).map((b) => {
      const pickup = b.deliveryAddress?.split(",")[0]?.trim() || "—";
      const drop = b.returnAddress?.split(",")[0]?.trim() || "—";
      const dur =
        b.duration === "DAY"
          ? "Day"
          : b.duration === "WEEK"
            ? "Week"
            : b.duration === "MONTH"
              ? "Month"
              : b.duration === "HOUR"
                ? "Hour"
                : b.duration;
      return {
        id: b.id,
        carId: b.carId,
        carName: b.car?.name ?? "—",
        carThumb: b.car?.thumbnail || b.car?.images?.[0] || null,
        durationLabel: dur,
        bookingType: b.bookingType,
        pickupShort: pickup,
        dropShort: drop,
        pickupDate: b.pickupDate,
        unitPrice: b.pricing?.price ?? b.totalPrice,
        pricingDuration: b.pricing?.duration ?? "DAY",
        userId: b.userId,
        userName:
          [b.user?.firstName, b.user?.lastName].filter(Boolean).join(" ").trim() ||
          b.user?.phoneNum ||
          "—",
      };
    });

    const topCustomers = [...usersWithCounts]
      .sort((a, b) => b._count.bookings - a._count.bookings)
      .slice(0, 5)
      .map((u, idx) => ({
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.phoneNum,
        bookings: u._count.bookings,
        badge: idx % 2 === 0 ? "Client" : "Company",
      }));

    const recentInvoices = payments.slice(0, 5).map((p) => {
      const name =
        [p.user?.firstName, p.user?.lastName].filter(Boolean).join(" ").trim() || "—";
      const st =
        p.status === "SUCCESS"
          ? "Paid"
          : p.status === "PENDING"
            ? "Pending"
            : p.status === "FAILED"
              ? "Overdue"
              : "Pending";
      return {
        id: p.id,
        invoiceNo: `#${p.id.slice(-6).toUpperCase()}`,
        userId: p.userId,
        customerName: name,
        email: p.user?.email || "—",
        createdDate: p.createdAt,
        dueDate: p.booking?.returnDate || p.createdAt,
        amount: p.amount,
        status: st,
      };
    });

    res.status(200).json({
      adminName: admin?.name || "Admin",
      summary: {
        totalCars,
        totalUsers,
        inRental,
        upcoming,
        totalReservations: totalBookings,
        reservationsWeekChange: percentChange(bookingsThisWeek.length, bookingsPrevWeek.length),
        totalEarnings,
        earningsWeekChange: percentChange(earningsThisWeek, earningsPrevWeek),
        carsWeekChange: percentChange(carsThisWeek, carsPrevWeek),
      },
      sparklines: {
        categoriesMonth: monthBuckets.map((m) => m.label),
        reservations: sparkReservationsMonth,
        earnings: monthBuckets.map((bucket) =>
          allBookings
            .filter((b) => {
              const t = new Date(b.createdAt);
              return (
                t >= bucket.start &&
                t <= bucket.end &&
                ["COMPLETED", "CONFIRMED"].includes(b.status)
              );
            })
            .reduce((s, b) => s + (b.totalPrice || 0), 0)
        ),
        cars: monthBuckets.map((bucket) => {
          const count = allBookings.filter((b) => {
            const t = new Date(b.createdAt);
            return t >= bucket.start && t <= bucket.end;
          }).length;
          return Math.max(0, Math.round(count * 0.15));
        }),
        last7DayLabels: dayBuckets.map((d) => d.label),
        reservationsDaily: sparkReservations,
        earningsDaily: sparkEarnings,
        carsDaily: sparkCars,
      },
      weeklyBars: {
        categories: dayBuckets.map((d) => d.label),
        income: incomeByDay.map((v) => Math.round(v / 1000) || 0),
        expense: expenseByDay.map((v) => Math.round(v / 1000) || 0),
      },
      incomeExpenseSummary: {
        incomeThisWeek: incomeThisWeekRounded,
        expenseThisWeek: Math.abs(expenseThisWeek),
        incomeChangePct: percentChange(incomeThisWeekRounded, Math.round(prevWeekIncome)),
        expenseChangePct: percentChange(Math.abs(expenseThisWeek), Math.abs(prevWeekExpense)),
      },
      newlyAddedCar: newlyAdded
        ? {
            id: newlyAdded.id,
            name: newlyAdded.name,
            category: newlyAdded.category || newlyAdded.brand,
            thumbnail: newlyAdded.thumbnail || newlyAdded.images?.[0] || null,
            fuelType: newlyAdded.fuelType,
            seating: newlyAdded.seating,
            powerType: newlyAdded.powerType,
            dayPrice,
          }
        : null,
      recentBookings,
      topCustomers,
      recentInvoices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
