const express = require("express");

// Authentication middleware
const { protect, allowedTo } = require("../controllers/auth.controller");

// controllers
const {
  getClinicById,
  createClinic,
  updateClinic,
  deleteClinic,
  getAllClinics,
} = require("../controllers/clinic.controller");

// Validators
const {
  getClinicByIdValidator,
  createClinicValidator,
  updateClinicValidator,
  deleteClinicValidator,
} = require("../validators/clinic.validators");

const router = express.Router();

// Public routes (no authentication required)
router.get("/", getAllClinics);
router.get("/:id", getClinicByIdValidator, getClinicById);

// Protected routes (authentication required)
router.use(protect, allowedTo("admin"));
// Routes accessible by admin only
router.post("/", createClinicValidator, createClinic);

router
  .route("/:id")
  .patch(updateClinicValidator, updateClinic)
  .delete(deleteClinicValidator, deleteClinic);

module.exports = router;
