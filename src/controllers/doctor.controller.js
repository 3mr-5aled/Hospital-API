const {
  uploadSingleImage,
  resizeImages,
} = require("../middlewares/uploadImage.middleware");
const Doctor = require("../models/doctor.model");
const factory = require("./handlers.factory");

// Upload single image
exports.uploadDoctorImage = uploadSingleImage("profileImg");

exports.resizeImage = resizeImages({
  fieldName: "profileImg",
  uploadPath: "user",
  mimetype: "jpeg",
  quality: 95,
  imageLength: 600,
  imageWidth: 600,
});

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
exports.getAllDoctors = factory.getAll(Doctor, "Doctors");

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = factory.getOne(Doctor);

// @desc    Create a doctor
// @route   POST /api/doctors
// @access  Public
exports.createDoctor = factory.createOne(Doctor);

// @desc    Update a doctor
// @route   PUT /api/doctors/:id
// @access  Public
exports.updateDoctor = factory.updateOne(Doctor);

// @desc    Delete a doctor
// @route   DELETE /api/doctors/:id
// @access  Public
exports.deleteDoctor = factory.deleteOne(Doctor);
