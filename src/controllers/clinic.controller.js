const Clinic = require("../models/clinic.model");
const factory = require("./handlers.factory");

// @desc    Get all Clinics
// @route   GET /api/clinics
// @access  Private
exports.getAllClinics = factory.getAll(Clinic, "Clinics");

// @desc    Get clinic by ID
// @route   GET /api/clinics/:id
// @access  Public
exports.getClinicById = factory.getOne(Clinic);

// @desc    Create a clinic
// @route   POST /api/clinics
// @access  Private
exports.createClinic = factory.createOne(Clinic);

// @desc    Update a clinic
// @route   PUT /api/clinics/:id
// @access  Private
exports.updateClinic = factory.updateOne(Clinic);

// @desc    Delete a clinic
// @route   DELETE /api/clinics/:id
// @access  Private
exports.deleteClinic = factory.deleteOne(Clinic);
