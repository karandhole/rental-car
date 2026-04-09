import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import {router as authRoute} from './app/user/routes/auth.route.js';
import carRoute from './app/user/routes/car.route.js'
import carColorRoute from './app/user/routes/carColor.route.js'
import carPricingRoute from './app/user/routes/carPricing.route.js'
import bookingRoute from './app/user/routes/booking.route.js'
import userCouponRoute from './app/user/routes/coupon.route.js'
import carReviewRoute from './app/user/routes/carReview.route.js'
import userRoute from './app/user/routes/user.route.js'
import adminUserRoute from './app/admin/routes/user.route.js'
import paymentRoute from "./app/user/routes/payment.route.js";
import adminAuthRoute from './app/admin/routes/auth.route.js'
import carPartnerAuthRoute from './app/car partner/routes/auth.route.js'
import adminProfile from './app/admin/routes/admin.route.js'
import carPartnerRoute from './app/admin/routes/carPartner.route.js'
import carPartnerCPRoute from './app/car partner/routes/carPartner.route.js'
import carPartnerCarRoute from './app/car partner/routes/car.route.js'
import carPartnerBookingRoute from './app/car partner/routes/booking.route.js'
import carPartnerDashboardRoute from './app/car partner/routes/dashboard.route.js'
import carPartnerUnavailabilityRoute from './app/car partner/routes/unavailability.route.js'
import adminUnavailabilityRoute from './app/admin/routes/unavailability.route.js'
import couponRoute from './app/admin/routes/coupon.route.js'
import adminReservationsRoute from './app/admin/routes/reservations.rotue.js'
import adminDashboardRoute from './app/admin/routes/dashboard.route.js'
import contactRoute from './app/user/routes/contact.route.js'
import adminCarRoute from './app/admin/routes/car.route.js'
import adminSeasonalPricingRoute from './app/admin/routes/seasonalPricing.route.js'
import adminPaymentRoute from './app/admin/routes/payment.route.js'
import cors from 'cors'




const ORIGIN = process.env.ORIGIN || "http://localhost:5173"


dotenv.config();
const app = express();
app.use(express.json())
app.use(cors({
  origin: ORIGIN, // Replace with your frontend URL if different
  credentials: true,
}))
 
// Default 4000 matches Frontend/.env.development (VITE_API_BASE_URL)
const PORT = process.env.PORT || 4000

app.get('/health',(req,res)=>{
    res.send("Ekal Server is Running");
}) 


// user route
app.use('/api/auth',authRoute);
app.use('/api/cars',carRoute)
app.use('/api/car-colors',carColorRoute)
app.use('/api/car-pricing',carPricingRoute)
app.use('/api/bookings',bookingRoute)
app.use('/api/coupons', userCouponRoute)
app.use('/api/car-review',carReviewRoute)
app.use('/api/users',userRoute)
app.use("/api/payment", paymentRoute);
app.use("/api/contact", contactRoute);


// amdin route
app.use('/api/admin/profile', adminProfile)
app.use('/api/admin/auth',adminAuthRoute)
app.use('/api/admin/car-partner',carPartnerRoute)
app.use('/api/admin/users',adminUserRoute)
app.use('/api/admin/coupons', couponRoute)
app.use('/api/admin/reservations', adminReservationsRoute)
app.use('/api/admin/dashboard', adminDashboardRoute)
app.use('/api/admin/cars', adminCarRoute)
app.use('/api/admin/seasonal-pricing', adminSeasonalPricingRoute)
app.use('/api/admin/payments', adminPaymentRoute)


// car partner route
app.use('/api/car-partner/auth',carPartnerAuthRoute)
app.use('/api/car-partner', carPartnerCPRoute)
app.use('/api/car-partner/cars', carPartnerCarRoute)
app.use('/api/car-partner/bookings', carPartnerBookingRoute)
app.use('/api/car-partner/dashboard', carPartnerDashboardRoute)
app.use('/api/car-partner/unavailability', carPartnerUnavailabilityRoute)

// admin unavailability
app.use('/api/admin/unavailability', adminUnavailabilityRoute)










app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.resolve("uploads"))
);



app.listen(PORT,(error)=>{
    if(error){
        console.log(error);
    }
    console.log("Server is running on the PORT: ",PORT)
})