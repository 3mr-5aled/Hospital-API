const express = require("express");

// Authentication middleware
const { protect, allowedTo } = require("../middlewares/auth.middleware");

// controllers
const {
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAllAppointments,
  getApprovedAppointments,
  registerAppointment,
  cancelAppointmentRegistration,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
} = require("../controllers/appointment.controller");

// Validators
const {
  getAppointmentByIdValidator,
  createAppointmentValidator,
  updateAppointmentValidator,
  deleteAppointmentValidator,
  getAppointmentsByDateValidator,
  updateAppointmentStatusValidator,
  registerAppointmentValidator,
  cancelAppointmentRegistrationValidator,
  cancelOwnAppointmentRegistrationValidator,
  approveRegistrationValidator,
  rejectRegistrationValidator,
} = require("../validators/appointment.validators");

const router = express.Router();

// Public routes (no authentication required)
// Get all appointments with approved patients only (public view)
router.get(
  "/approved",
  getAppointmentsByDateValidator,
  getApprovedAppointments
);

// Get all appointments with optional filtering (date range, doctor, clinic, status)
router.get("/", getAppointmentsByDateValidator, getAllAppointments);

// Get specific appointment by ID
router.get("/:id", getAppointmentByIdValidator, getAppointmentById);

// Register patient for existing appointment (public access for patients)
router.post("/:id/register", registerAppointmentValidator, registerAppointment);

// Cancel patient registration for appointment (public access for patients)
router.delete(
  "/:id/cancel",
  cancelAppointmentRegistrationValidator,
  cancelAppointmentRegistration
);

// Protected routes (authentication required)
router.use(protect);

// Routes for patients - they can view their own appointments
router.get("/my/appointments", allowedTo("patient"), getAllAppointments);

// Routes for patients - they can cancel their own appointment registrations
router.delete(
  "/:id/cancel-my-registration",
  allowedTo("patient"),
  cancelOwnAppointmentRegistrationValidator,
  cancelAppointmentRegistration
);

// Routes for doctors and admins
router.post(
  "/",
  allowedTo("doctor", "admin"),
  createAppointmentValidator,
  createAppointment
);

// Routes for specific appointments - require authentication
router
  .route("/:id")
  .patch(
    allowedTo("doctor", "admin"),
    updateAppointmentValidator,
    updateAppointment
  )
  .delete(allowedTo("admin"), deleteAppointmentValidator, deleteAppointment);

// Update appointment status - doctors and admins can update status
router.patch(
  "/:id/status",
  allowedTo("doctor", "admin"),
  updateAppointmentStatusValidator,
  updateAppointment
);

// Admin-only routes for approval system
router.get(
  "/pending-registrations",
  allowedTo("admin"),
  getPendingRegistrations
);

router.patch(
  "/:id/approve-registration",
  allowedTo("admin"),
  approveRegistrationValidator,
  approveRegistration
);

router.patch(
  "/:id/reject-registration",
  allowedTo("admin"),
  rejectRegistrationValidator,
  rejectRegistration
);

module.exports = router;
