const {
  uploadSingleImage,
  resizeImages,
} = require("../middlewares/uploadImage.middleware");
const Patient = require("../models/patient.model");
const Appointment = require("../models/appointment.model");
const factory = require("./handlers.factory");

// Upload single image
exports.uploadPatientImage = uploadSingleImage("profileImg");

exports.resizeImage = resizeImages({
  fieldName: "profileImg",
  uploadPath: "user",
  mimetype: "jpeg",
  quality: 95,
  imageLength: 600,
  imageWidth: 600,
});

// @desc    Get all patients
// @route   GET /api/patients
// @access  Public
exports.getAllPatients = factory.getAll(Patient, "Patients");

// @desc    Get patient by ID
// @route   GET /api/patients/:id
// @access  Public
exports.getPatientById = factory.getOne(Patient);

// @desc    Create a patient
// @route   POST /api/patients
// @access  Public
exports.createPatient = factory.createOne(Patient);

// @desc    Update a patient
// @route   PUT /api/patients/:id
// @access  Public
exports.updatePatient = factory.updateOne(Patient);

// @desc    Delete a patient
// @route   DELETE /api/patients/:id
// @access  Public
exports.deletePatient = factory.deleteOne(Patient);

// @desc    Get patient upcoming appointments
// @route   GET /api/patients/appointments/upcoming
// @access  Private (Patient)
exports.getPatientUpcomingAppointments = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    // Find appointments where this patient is registered
    const appointments = await Appointment.find({
      "patient.patientId": patientId,
      date: { $gte: new Date() },
    })
      .populate("doctor", "fullName specialization")
      .populate("clinic", "name location")
      .sort({ date: 1, time: 1 });

    if (!appointments || appointments.length === 0) {
      return res.status(200).json({
        status: "success",
        results: 0,
        data: [],
        message: "No upcoming appointments found",
      });
    }

    // Filter to show only this patient's registration details
    const patientAppointments = appointments
      .map((appointment) => {
        const patientRegistration = appointment.patient.find(
          (p) => p.patientId.toString() === patientId.toString()
        );

        if (!patientRegistration) return null;

        return {
          appointmentId: appointment._id,
          doctor: appointment.doctor,
          clinic: appointment.clinic,
          date: appointment.date,
          time: appointment.time,
          notes: appointment.notes,
          registrationStatus: patientRegistration.registrationStatus,
          registeredAt: patientRegistration.registeredAt,
          approvedAt: patientRegistration.approvedAt,
          rejectionReason: patientRegistration.rejectionReason,
          appointmentType: patientRegistration.appointmentType,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      status: "success",
      results: patientAppointments.length,
      data: patientAppointments,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch upcoming appointments",
    });
    return next(error);
  }
};
