/**
 * Turnaround buffer around each rental window (pickup prep + return processing).
 * Used consistently for search overlap checks and calendar display.
 */
export const BOOKING_BUFFER_MS = 2 * 60 * 60 * 1000; // 2 hour

export const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_RENTAL",
];

export function expandRangeWithBuffer(start, end) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  return {
    start: new Date(s),
    end: new Date(e.getTime() + BOOKING_BUFFER_MS), // Return + 2 hrs buffer
  };
}

/** True if [aStart, aEnd) overlaps [bStart, bEnd) (touching endpoints do not count as overlap). */
export function rangesOverlapMs(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * @param {string|undefined} pickupIso
 * @param {string|undefined} returnIso  — use returnAt from query string
 */
export function parseRentalWindow(pickupIso, returnIso) {
  if (!pickupIso || !returnIso) return null;
  const pickup = new Date(pickupIso);
  const ret = new Date(returnIso);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) return null;
  if (pickup.getTime() >= ret.getTime()) return null;
  return { pickup, return: ret };
}

export function bookingBlocksOverlapSearch(bookingPickup, bookingReturn, searchPickup, searchReturn) {
  const searchBuf = expandRangeWithBuffer(searchPickup, searchReturn);
  const bookingBuf = expandRangeWithBuffer(bookingPickup, bookingReturn);
  return rangesOverlapMs(
    searchBuf.start.getTime(),
    searchBuf.end.getTime(),
    bookingBuf.start.getTime(),
    bookingBuf.end.getTime()
  );
}

export async function hasBookingConflict(
  prisma,
  carId,
  pickupDate,
  returnDate
) {
  const existingBookings = await prisma.booking.findMany({
    where: {
      carId,
      status: {
        in: BLOCKING_BOOKING_STATUSES,
      },
    },
    select: {
      id: true,
      pickupDate: true,
      returnDate: true,
    },
  });

  return existingBookings.find((booking) =>
    bookingBlocksOverlapSearch(
      booking.pickupDate,
      booking.returnDate,
      pickupDate,
      returnDate
    )
  );
}