// Appointment validation rules
const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");
const validatorMiddleware = require("../middlewares/validator.middleware");
const Appointment = require("../models/appointment.model");
const Doctor = require("../models/doctor.model");
const Patient = require("../models/patient.model");
const Clinic = require("../models/clinic.model");

// Get appointment by ID validator
const getAppointmentByIdValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),
  validatorMiddleware,
];

// Create appointment validator
const createAppointmentValidator = [
  body("patient")
    .isArray()
    .withMessage("Patient must be an array")
    .notEmpty()
    .withMessage("At least one patient is required")
    .custom(async (value) => {
      // Validate each patient ID is a valid MongoId
      const invalidIds = value.filter(
        (patientId) => !mongoose.Types.ObjectId.isValid(patientId)
      );
      if (invalidIds.length > 0) {
        throw new Error(`Invalid patient ID format: ${invalidIds.join(", ")}`);
      }
      // Check if all patients exist
      const patients = await Patient.find({ _id: { $in: value } });
      if (patients.length !== value.length) {
        throw new Error("One or more patients do not exist");
      }
    }),

  body("doctor")
    .notEmpty()
    .withMessage("Doctor is required")
    .isMongoId()
    .withMessage("Invalid doctor ID format")
    .custom(async (value) => {
      const doctor = await Doctor.findById(value);
      if (!doctor) {
        throw new Error("Doctor does not exist");
      }
      if (!doctor.isActive) {
        throw new Error("Doctor is not currently active");
      }
    }),

  body("clinic")
    .notEmpty()
    .withMessage("Clinic is required")
    .isMongoId()
    .withMessage("Invalid clinic ID format")
    .custom(async (value) => {
      const clinic = await Clinic.findById(value);
      if (!clinic) {
        throw new Error("Clinic does not exist");
      }
    }),

  body("date")
    .notEmpty()
    .withMessage("Appointment date is required")
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw new Error("Appointment date cannot be in the past");
      }

      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);
      if (appointmentDate > maxDate) {
        throw new Error(
          "Appointment date cannot be more than 3 months in the future"
        );
      }

      return true;
    }),

  body("time")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format. Use HH:MM format (24-hour)"),

  body("status")
    .optional()
    .isIn(["Scheduled", "Completed", "Cancelled", "Missed"])
    .withMessage(
      "Status must be one of: Scheduled, Completed, Cancelled, Missed"
    ),

  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("isPaid")
    .optional()
    .isBoolean()
    .withMessage("isPaid must be a boolean value"),

  body("NumberOfPatients")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Number of patients must be between 1 and 10"),

  body("MaxNumberOfPatients")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Maximum number of patients must be between 1 and 10")
    .custom((value, { req }) => {
      const patientArray = req.body.patient || [];
      const numPatients = req.body.NumberOfPatients || patientArray.length || 1;
      if (value < numPatients) {
        throw new Error(
          "Maximum number of patients cannot be less than current number of patients"
        );
      }
      return true;
    }),

  // Custom validation to check for appointment conflicts
  body().custom(async (value, { req }) => {
    const { doctor, date, time } = req.body;

    if (doctor && date && time) {
      // Check for existing appointments at the same time
      const existingAppointment = await Appointment.findOne({
        doctor,
        date: new Date(date),
        time,
        status: { $in: ["Scheduled"] },
      });

      if (existingAppointment) {
        throw new Error(
          "Doctor already has an appointment at this date and time"
        );
      }
    }

    return true;
  }),

  validatorMiddleware,
];

// Update appointment validator
const updateAppointmentValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),

  body("patient")
    .optional()
    .isArray()
    .withMessage("Patient must be an array")
    .custom(async (value) => {
      if (value && value.length > 0) {
        const invalidIds = value.filter(
          (patientId) => !mongoose.Types.ObjectId.isValid(patientId)
        );
        if (invalidIds.length > 0) {
          throw new Error(
            `Invalid patient ID format: ${invalidIds.join(", ")}`
          );
        }
        const patients = await Patient.find({ _id: { $in: value } });
        if (patients.length !== value.length) {
          throw new Error("One or more patients do not exist");
        }
      }
    }),

  body("doctor")
    .optional()
    .isMongoId()
    .withMessage("Invalid doctor ID format")
    .custom(async (value) => {
      if (value) {
        const doctor = await Doctor.findById(value);
        if (!doctor) {
          throw new Error("Doctor does not exist");
        }
        if (!doctor.isActive) {
          throw new Error("Doctor is not currently active");
        }
      }
    }),

  body("clinic")
    .optional()
    .isMongoId()
    .withMessage("Invalid clinic ID format")
    .custom(async (value) => {
      if (value) {
        const clinic = await Clinic.findById(value);
        if (!clinic) {
          throw new Error("Clinic does not exist");
        }
      }
    }),

  body("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      if (value) {
        const appointmentDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appointmentDate < today) {
          throw new Error("Appointment date cannot be in the past");
        }

        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        if (appointmentDate > maxDate) {
          throw new Error(
            "Appointment date cannot be more than 3 months in the future"
          );
        }
      }
      return true;
    }),

  body("time")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format. Use HH:MM format (24-hour)"),

  body("status")
    .optional()
    .isIn(["Scheduled", "Completed", "Cancelled", "Missed"])
    .withMessage(
      "Status must be one of: Scheduled, Completed, Cancelled, Missed"
    ),

  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("isPaid")
    .optional()
    .isBoolean()
    .withMessage("isPaid must be a boolean value"),

  // Custom validation to check for appointment conflicts (excluding current appointment)
  body().custom(async (value, { req }) => {
    const { doctor, date, time } = req.body;

    if (doctor && date && time) {
      // Check for existing appointments at the same time (excluding current)
      const existingAppointment = await Appointment.findOne({
        _id: { $ne: req.params.id },
        doctor,
        date: new Date(date),
        time,
        status: { $in: ["Scheduled"] },
      });

      if (existingAppointment) {
        throw new Error(
          "Doctor already has an appointment at this date and time"
        );
      }
    }

    return true;
  }),

  validatorMiddleware,
];

// Delete appointment validator
const deleteAppointmentValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),
  validatorMiddleware,
];

// Get appointments query validator
const getAppointmentsByDateValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate < startDate) {
          throw new Error("End date cannot be before start date");
        }
      }
      return true;
    }),

  query("doctor")
    .optional()
    .isMongoId()
    .withMessage("Invalid doctor ID format"),

  query("patient")
    .optional()
    .isMongoId()
    .withMessage("Invalid patient ID format"),

  query("clinic")
    .optional()
    .isMongoId()
    .withMessage("Invalid clinic ID format"),

  query("status")
    .optional()
    .isIn(["Scheduled", "Completed", "Cancelled", "Missed"])
    .withMessage(
      "Status must be one of: Scheduled, Completed, Cancelled, Missed"
    ),

  validatorMiddleware,
];

// Update appointment status validator
const updateAppointmentStatusValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Scheduled", "Completed", "Cancelled", "Missed"])
    .withMessage(
      "Status must be one of: Scheduled, Completed, Cancelled, Missed"
    ),

  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  validatorMiddleware,
];

// Register for appointment validator (for patients to join existing appointments)
const registerAppointmentValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),

  body("patientId")
    .notEmpty()
    .withMessage("Patient ID is required")
    .isMongoId()
    .withMessage("Invalid patient ID format")
    .custom(async (value, { req }) => {
      // Check if patient exists
      const patient = await Patient.findById(value);
      if (!patient) {
        throw new Error("Patient does not exist");
      }

      // Check if appointment exists and is available
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        throw new Error("Appointment does not exist");
      }

      // Check if appointment is already full
      if (appointment.IsFull) {
        throw new Error("Appointment slot is full");
      }

      // Check if patient is already registered for this appointment
      const isAlreadyRegistered = appointment.patient.some(
        (patientId) => patientId.toString() === value
      );
      if (isAlreadyRegistered) {
        throw new Error("Patient is already registered for this appointment");
      }

      return true;
    }),

  validatorMiddleware,
];

// Cancel appointment registration validator (for patients to leave appointments)
const cancelAppointmentRegistrationValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),

  body("patientId")
    .optional()
    .isMongoId()
    .withMessage("Invalid patient ID format")
    .custom(async (value, { req }) => {
      if (value) {
        // Check if patient exists
        const patient = await Patient.findById(value);
        if (!patient) {
          throw new Error("Patient does not exist");
        }

        // Check if appointment exists
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
          throw new Error("Appointment does not exist");
        }

        // Check if patient is registered for this appointment
        const isRegistered = appointment.patient.some(
          (patientId) => patientId.toString() === value
        );
        if (!isRegistered) {
          throw new Error("Patient is not registered for this appointment");
        }

        // Check if appointment is in the future
        const appointmentDateTime = new Date(appointment.date);
        if (appointment.time) {
          const [hours, minutes] = appointment.time.split(":");
          appointmentDateTime.setHours(
            parseInt(hours, 10),
            parseInt(minutes, 10)
          );
        }

        const now = new Date();
        if (appointmentDateTime <= now) {
          throw new Error("Cannot cancel appointment that has already passed");
        }

        // Check if appointment is not completed
        if (appointment.status === "Completed") {
          throw new Error("Cannot cancel a completed appointment");
        }
      }

      return true;
    }),

  validatorMiddleware,
];

// Cancel own appointment registration validator (for authenticated patients)
const cancelOwnAppointmentRegistrationValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid appointment ID format")
    .custom(async (value, { req }) => {
      // Check if appointment exists
      const appointment = await Appointment.findById(value);
      if (!appointment) {
        throw new Error("Appointment does not exist");
      }

      // For authenticated routes, patient ID will come from req.user
      // We'll validate this in the controller, but ensure appointment is cancellable
      const appointmentDateTime = new Date(appointment.date);
      if (appointment.time) {
        const [hours, minutes] = appointment.time.split(":");
        appointmentDateTime.setHours(
          parseInt(hours, 10),
          parseInt(minutes, 10)
        );
      }

      const now = new Date();
      if (appointmentDateTime <= now) {
        throw new Error("Cannot cancel appointment that has already passed");
      }

      if (appointment.status === "Completed") {
        throw new Error("Cannot cancel a completed appointment");
      }

      return true;
    }),

  validatorMiddleware,
];

// Approve registration validator
const approveRegistrationValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),
  body("patientId")
    .notEmpty()
    .withMessage("Patient ID is required")
    .isMongoId()
    .withMessage("Invalid patient ID format")
    .custom(async (value, { req }) => {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        throw new Error("Appointment not found");
      }

      const patientRegistration = appointment.patient.find(
        (p) =>
          p.patientId.toString() === value && p.registrationStatus === "pending"
      );

      if (!patientRegistration) {
        throw new Error("No pending registration found for this patient");
      }

      return true;
    }),
  validatorMiddleware,
];

// Reject registration validator
const rejectRegistrationValidator = [
  param("id").isMongoId().withMessage("Invalid appointment ID format"),
  body("patientId")
    .notEmpty()
    .withMessage("Patient ID is required")
    .isMongoId()
    .withMessage("Invalid patient ID format")
    .custom(async (value, { req }) => {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        throw new Error("Appointment not found");
      }

      const patientRegistration = appointment.patient.find(
        (p) =>
          p.patientId.toString() === value && p.registrationStatus === "pending"
      );

      if (!patientRegistration) {
        throw new Error("No pending registration found for this patient");
      }

      return true;
    }),
  body("rejectionReason")
    .optional()
    .isString()
    .withMessage("Rejection reason must be a string")
    .isLength({ max: 500 })
    .withMessage("Rejection reason must not exceed 500 characters"),
  validatorMiddleware,
];

module.exports = {
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
};
