import nodemailer from "nodemailer";

const bookingTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const sendBookingConfirmationEmails = async ({
  booking,
  customer,
  payment,
}) => {
  if (!customer?.email) {
    throw new Error("Customer email is missing.");
  }

  const customerName =
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    "Customer";

  const carName =
    booking?.car?.brand
      ? `${booking.car.brand} ${booking.car.name || ""}`.trim()
      : booking?.car?.name || "Rental Car";

  // --------------------------------------------------
  // 1. CUSTOMER EMAIL
  // --------------------------------------------------

  await bookingTransporter.sendMail({
    from: `"Ekalo Drive" <${process.env.SMTP_USER}>`,
    to: customer.email,
    subject: `Booking Confirmed - ${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; color: #333;">

        <div style="background:#055c9d; padding:20px; text-align:center;">
          <h2 style="color:#fff; margin:0;">
            EKALO DRIVE
          </h2>
        </div>

        <div style="padding:25px;">

          <h2 style="color:#198754;">
            Booking Confirmed ✓
          </h2>

          <p>
            Dear <strong>${customerName}</strong>,
          </p>

          <p>
            Thank you for choosing <strong>Ekalo Drive</strong>.
            Your car booking has been successfully confirmed.
          </p>

          <div style="
            background:#f7f7f7;
            padding:18px;
            border-radius:8px;
            margin:20px 0;
          ">

            <h3>Booking Details</h3>

            <p>
              <strong>Booking ID:</strong>
              ${booking.id}
            </p>

            <p>
              <strong>Car:</strong>
              ${carName}
            </p>

            <p>
              <strong>Booking Type:</strong>
              ${booking.bookingType || "-"}
            </p>

            <p>
              <strong>Pickup Date:</strong>
              ${formatDate(booking.pickupDate)}
            </p>

            <p>
              <strong>Return Date:</strong>
              ${formatDate(booking.returnDate)}
            </p>

            <p>
              <strong>Pickup Location:</strong>
              ${booking.deliveryAddress || "-"}
            </p>

            <p>
              <strong>Return Location:</strong>
              ${booking.returnAddress || "-"}
            </p>

            <p>
              <strong>Total Paid:</strong>
              ₹${Number(booking.totalPrice || 0).toLocaleString("en-IN")}
            </p>

            <p>
              <strong>Payment ID:</strong>
              ${payment?.razorpayPaymentId || booking.paymentId || "-"}
            </p>

          </div>

          <p>
            Your booking is now confirmed. Please keep your Booking ID
            for future reference.
          </p>

          <hr />

          <p style="font-size:13px; color:#777;">
            If you have any questions, please contact us at
            <strong>support@ekalodrive.com</strong>.
          </p>

          <p>
            Regards,<br/>
            <strong>Ekalo Drive Team</strong>
          </p>

        </div>
      </div>
    `,
  });

  console.log(`✅ Customer booking email sent to ${customer.email}`);

  // --------------------------------------------------
  // 2. ADMIN EMAIL
  // --------------------------------------------------

  await bookingTransporter.sendMail({
    from: `"Ekalo Drive Booking" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🚗 New Booking Received - ${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; color:#333;">

        <div style="background:#055c9d; padding:20px;">
          <h2 style="color:white; margin:0;">
            New Booking Received
          </h2>
        </div>

        <div style="padding:25px;">

          <h3>Customer Details</h3>

          <p>
            <strong>Name:</strong>
            ${customerName}
          </p>

          <p>
            <strong>Email:</strong>
            ${customer.email}
          </p>

          <p>
            <strong>Phone:</strong>
            ${customer.phoneNum || "-"}
          </p>

          <hr />

          <h3>Booking Details</h3>

          <p>
            <strong>Booking ID:</strong>
            ${booking.id}
          </p>

          <p>
            <strong>Car:</strong>
            ${carName}
          </p>

          <p>
            <strong>Booking Type:</strong>
            ${booking.bookingType || "-"}
          </p>

          <p>
            <strong>Pickup Date:</strong>
            ${formatDate(booking.pickupDate)}
          </p>

          <p>
            <strong>Return Date:</strong>
            ${formatDate(booking.returnDate)}
          </p>

          <p>
            <strong>Pickup Location:</strong>
            ${booking.deliveryAddress || "-"}
          </p>

          <p>
            <strong>Return Location:</strong>
            ${booking.returnAddress || "-"}
          </p>

          <p>
            <strong>Total Amount:</strong>
            ₹${Number(booking.totalPrice || 0).toLocaleString("en-IN")}
          </p>

          <p>
            <strong>Payment ID:</strong>
            ${payment?.razorpayPaymentId || booking.paymentId || "-"}
          </p>

          <p>
            <strong>Order ID:</strong>
            ${payment?.razorpayOrderId || booking.orderId || "-"}
          </p>

          <p>
            <strong>Payment Status:</strong>
            <span style="color:green; font-weight:bold;">
              SUCCESS
            </span>
          </p>

          <hr />

          <p>
            Please check the admin dashboard for complete booking details.
          </p>

          <p>
            Regards,<br/>
            <strong>Ekalo Drive System</strong>
          </p>

        </div>
      </div>
    `,
  });

  console.log(`✅ Admin booking email sent to ${process.env.ADMIN_EMAIL}`);
};