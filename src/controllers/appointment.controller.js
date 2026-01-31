// Appointment controller functions
const Appointment = require("../models/appointment.model");
const factory = require("./handlers.factory");
const { ApiError } = require("../utils");

// @desc    Get all Appointments
// @route   GET /api/appointments
// @access  Private
exports.getAllAppointments = factory.getAll(Appointment, "Appointments");

// @desc    Get appointments with approved patients only (Public view)
// @route   GET /api/appointments/approved
// @access  Public
exports.getApprovedAppointments = async (req, res, next) => {
  try {
    let filter = {};
    if (req.filterObj) {
      filter = req.filterObj;
    }

    const appointments = await Appointment.find(filter).sort({
      priority: 1,
      date: 1,
    });

    // Filter to show only approved patients in each appointment
    const appointmentsWithApproved = appointments.map((appointment) => {
      const approvedPatients = appointment.patient.filter(
        (p) => p.registrationStatus === "approved"
      );

      // Only return appointments that have approved patients or are available for registration
      return {
        ...appointment.toObject(),
        patient: approvedPatients,
        NumberOfPatients: approvedPatients.length,
        IsFull: approvedPatients.length >= appointment.MaxNumberOfPatients,
      };
    });

    res.status(200).json({
      status: "success",
      results: appointmentsWithApproved.length,
      data: appointmentsWithApproved,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Public
exports.getAppointmentById = factory.getOne(Appointment);

// @desc    Create a appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
  try {
    // Create the appointment with all type information included
    const appointment = await Appointment.create(req.body);

    res.status(201).json({
      status: "success",
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update a Appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = factory.updateOne(Appointment);

// @desc    Delete a appointment
// @route   DELETE /api/appointments/:id
// @access  Private
exports.deleteAppointment = factory.deleteOne(Appointment);

// @desc    Register for an appointment (Public) - Creates pending registration
// @route   POST /api/appointments/register
// @access  Public
exports.registerAppointment = async (req, res, next) => {
  // check if the appointment slot is available
  try {
    const appointment = await Appointment.findById(req.params.id);
    // check if appointment exists
    if (!appointment) {
      return next(
        new ApiError(`No appointment for this id ${req.params.id}`, 404)
      );
    }

    // Count only approved patients for availability check
    const approvedPatients = appointment.patient.filter(
      (p) => p.registrationStatus === "approved"
    ).length;

    // check if it is full (based on approved patients only)
    if (approvedPatients >= appointment.MaxNumberOfPatients) {
      return next(new ApiError("Appointment slot is full", 400));
    }

    // Check if patient is already registered (any status)
    const existingRegistration = appointment.patient.find(
      (p) => p.patientId.toString() === req.body.patientId
    );

    if (existingRegistration) {
      if (existingRegistration.registrationStatus === "pending") {
        return next(
          new ApiError("Registration is already pending approval", 400)
        );
      }
      if (existingRegistration.registrationStatus === "approved") {
        return next(
          new ApiError(
            "Patient is already registered for this appointment",
            400
          )
        );
      }
      // If previously rejected, allow re-registration
    }

    // Create new patient registration with pending status
    const newRegistration = {
      patientId: req.body.patientId,
      registrationStatus: "pending",
      registeredAt: new Date(),
      symptoms: req.body.symptoms || "",
      prescriptions: req.body.prescriptions || [],
      medicalRecords: req.body.medicalRecords || [],
    };

    // Remove any previous rejected registration for the same patient
    appointment.patient = appointment.patient.filter(
      (p) =>
        !(
          p.patientId.toString() === req.body.patientId &&
          p.registrationStatus === "rejected"
        )
    );

    // Add the new pending registration
    appointment.patient.push(newRegistration);

    // save the appointment
    await appointment.save();

    res.status(200).json({
      status: "success",
      message: "Registration submitted successfully. Awaiting admin approval.",
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Cancel appointment registration for a patient
// @route   DELETE /api/appointments/:id/cancel
// @access  Private (Patient only)
exports.cancelAppointmentRegistration = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    // Check if appointment exists
    if (!appointment) {
      return next(
        new ApiError(`No appointment found with id ${req.params.id}`, 404)
      );
    }

    // Get patient ID from authenticated user or request body
    const patientId = req.body.patientId || (req.user && req.user.id);

    if (!patientId) {
      return next(new ApiError("Patient ID is required", 400));
    }

    // Check if patient is registered for this appointment
    const patientIndex = appointment.patient.findIndex(
      (patient) => patient.patientId.toString() === patientId
    );

    if (patientIndex === -1) {
      return next(
        new ApiError("Patient is not registered for this appointment", 400)
      );
    }

    // Check if appointment can be cancelled (not in past, not completed)
    const appointmentDateTime = new Date(appointment.date);
    if (appointment.time) {
      const [hours, minutes] = appointment.time.split(":");
      appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    }

    const now = new Date();
    if (appointmentDateTime <= now) {
      return next(
        new ApiError("Cannot cancel appointment that has already passed", 400)
      );
    }

    if (appointment.status === "Completed") {
      return next(new ApiError("Cannot cancel a completed appointment", 400));
    }

    // Remove patient from appointment
    appointment.patient.splice(patientIndex, 1);

    // The pre-save hook will automatically update NumberOfPatients and IsFull
    // based on approved patients only

    // If no patients left, optionally cancel the appointment entirely
    if (appointment.patient.length === 0) {
      appointment.status = "Cancelled";
      appointment.notes = appointment.notes
        ? `${appointment.notes}\nCancelled: No patients registered.`
        : "Cancelled: No patients registered.";
    }

    await appointment.save();

    res.status(200).json({
      status: "success",
      message: "Successfully cancelled appointment registration",
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all pending appointment registrations (Admin only)
// @route   GET /api/appointments/pending-registrations
// @access  Private (Admin only)
exports.getPendingRegistrations = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      "patient.registrationStatus": "pending",
    });

    // Filter to show only appointments with pending registrations
    const appointmentsWithPending = appointments
      .map((appointment) => {
        const pendingPatients = appointment.patient.filter(
          (p) => p.registrationStatus === "pending"
        );
        return {
          ...appointment.toObject(),
          patient: pendingPatients,
        };
      })
      .filter((appointment) => appointment.patient.length > 0);

    res.status(200).json({
      status: "success",
      results: appointmentsWithPending.length,
      data: appointmentsWithPending,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Approve patient registration for appointment (Admin only)
// @route   PATCH /api/appointments/:id/approve-registration
// @access  Private (Admin only)
exports.approveRegistration = async (req, res, next) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return next(new ApiError("Patient ID is required", 400));
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return next(
        new ApiError(`No appointment found with id ${req.params.id}`, 404)
      );
    }

    // Find the patient registration
    const patientRegistration = appointment.patient.find(
      (p) =>
        p.patientId.toString() === patientId &&
        p.registrationStatus === "pending"
    );

    if (!patientRegistration) {
      return next(
        new ApiError("No pending registration found for this patient", 404)
      );
    }

    // Check if approving this patient would exceed capacity
    const currentApprovedCount = appointment.patient.filter(
      (p) => p.registrationStatus === "approved"
    ).length;

    if (currentApprovedCount >= appointment.MaxNumberOfPatients) {
      return next(
        new ApiError(
          "Cannot approve: appointment is already at maximum capacity",
          400
        )
      );
    }

    // Approve the registration
    patientRegistration.registrationStatus = "approved";
    // admin who approved
    patientRegistration.approvedBy = req.user.id;
    patientRegistration.approvedAt = new Date();

    await appointment.save();

    res.status(200).json({
      status: "success",
      message: "Patient registration approved successfully",
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Reject patient registration for appointment (Admin only)
// @route   PATCH /api/appointments/:id/reject-registration
// @access  Private (Admin only)
exports.rejectRegistration = async (req, res, next) => {
  try {
    const { patientId, rejectionReason } = req.body;

    if (!patientId) {
      return next(new ApiError("Patient ID is required", 400));
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return next(
        new ApiError(`No appointment found with id ${req.params.id}`, 404)
      );
    }

    // Find the patient registration
    const patientRegistration = appointment.patient.find(
      (p) =>
        p.patientId.toString() === patientId &&
        p.registrationStatus === "pending"
    );

    if (!patientRegistration) {
      return next(
        new ApiError("No pending registration found for this patient", 404)
      );
    }

    // Reject the registration
    patientRegistration.registrationStatus = "rejected";
    patientRegistration.approvedBy = req.user.id;
    patientRegistration.approvedAt = new Date();
    if (rejectionReason) {
      patientRegistration.rejectionReason = rejectionReason;
    }

    await appointment.save();

    res.status(200).json({
      status: "success",
      message: "Patient registration rejected",
      data: appointment,
    });
  } catch (error) {
    return next(error);
  }
};
