const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const slugify = require("slugify");

const asyncHandler = require("express-async-handler");
const { ApiError, emailUtils, createToken } = require("../utils");

const { sendEmail } = emailUtils;
const { APP_NAME } = require("../config/app.config");

// Import all models
const User = require("../models/user.model");
const Doctor = require("../models/doctor.model");
const Patient = require("../models/patient.model");

// Helper function to generate medical record number
const generateMedicalRecordNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `MRN${timestamp.slice(-6)}${random}`;
};

// Helper function to generate 6-digit reset code
const generateResetCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Signup
// @route   POST /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  const {
    fullName,
    email,
    password,
    role,
    phone,
    gender,
    dateOfBirth,
    specialization,
    bloodType,
    allergies,
    chronicDiseases,
  } = req.body;

  // 1- Create base user first
  const user = await User.create({
    name: fullName,
    email,
    password, // Let the User model middleware handle hashing
    phone,
    role: role || "patient",
  });

  // 2- Create role-specific profile
  let roleProfile;
  if (role === "doctor") {
    roleProfile = await Doctor.create({
      user: user._id,
      fullName,
      slug: slugify(fullName, { lower: true }),
      gender,
      dateOfBirth,
      specialization,
    });
  } else if (role === "patient") {
    roleProfile = await Patient.create({
      user: user._id,
      fullName,
      gender,
      dateOfBirth,
      bloodType: bloodType || "Unknown",
      allergies: allergies || [],
      chronicDiseases: chronicDiseases || [],
      medicalRecordNumber: generateMedicalRecordNumber(),
    });
  }

  // 3- Generate token
  const token = createToken(user._id);

  // 4- Prepare response
  const userData = {
    _id: user._id,
    fullName: (roleProfile && roleProfile.fullName) || user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    gender,
    dateOfBirth,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (role === "doctor") {
    userData.specialization = specialization;
  } else if (role === "patient") {
    userData.bloodType = bloodType;
    userData.medicalRecordNumber = roleProfile.medicalRecordNumber;
  }

  res.status(201).json({
    status: "success",
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
    data: { user: userData, token },
  });
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  // 1) Check if user exists and get password
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  // 2) Check if role matches
  if (role && user.role !== role) {
    return next(new ApiError(`User is not registered as ${role}`, 401));
  }

  // 3) Update last login
  user.lastLogin = new Date();
  await user.save();

  // 4) Get role-specific profile
  let roleProfile = null;
  if (user.role === "doctor") {
    roleProfile = await Doctor.findOne({ user: user._id });
  } else if (user.role === "patient") {
    roleProfile = await Patient.findOne({ user: user._id });
  }

  // 5) Generate token
  const token = createToken(user._id);

  // 6) Prepare response
  const userData = {
    _id: user._id,
    fullName: (roleProfile && roleProfile.fullName) || user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    lastLogin: user.lastLogin,
  };

  if (roleProfile) {
    userData.gender = roleProfile.gender;
    userData.dateOfBirth = roleProfile.dateOfBirth;

    if (user.role === "doctor") {
      userData.specialization = roleProfile.specialization;
    } else if (user.role === "patient") {
      userData.bloodType = roleProfile.bloodType;
      userData.medicalRecordNumber = roleProfile.medicalRecordNumber;
    }
  }

  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: { user: userData, token },
  });
});

// @desc    make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Check if token exist, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not logged in! Please log in to access this resource",
        401
      )
    );
  }

  // 2) Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3) Check if user exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError("The user that belongs to this token no longer exists", 401)
    );
  }

  // 4) Check if user changed password after token was created
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed password. Please log in again.",
          401
        )
      );
    }
  }

  req.user = currentUser;
  next();
});

// @desc    Authorization (User Permissions)
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 1) access roles
    // 2) access registered user (req.user.role)
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You don't have permission to access this resource", 403)
      );
    }
    next();
  });

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  // Get role-specific profile
  let roleProfile = null;
  if (req.user.role === "doctor") {
    roleProfile = await Doctor.findOne({ user: req.user._id }).populate(
      "clinic"
    );
  } else if (req.user.role === "patient") {
    roleProfile = await Patient.findOne({ user: req.user._id });
  }

  const userData = {
    _id: req.user._id,
    fullName: (roleProfile && roleProfile.fullName) || req.user.name,
    email: req.user.email,
    role: req.user.role,
    phone: req.user.phone,
    isVerified: req.user.isVerified,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt,
  };

  if (roleProfile) {
    userData.gender = roleProfile.gender;
    userData.dateOfBirth = roleProfile.dateOfBirth;
    userData.profileImg = roleProfile.profileImg;

    if (req.user.role === "doctor") {
      userData.specialization = roleProfile.specialization;
      userData.clinic = roleProfile.clinic;
      userData.qualifications = roleProfile.qualifications;
      userData.yearsOfExperience = roleProfile.yearsOfExperience;
      userData.availability = roleProfile.availability;
      userData.isActive = roleProfile.isActive;
    } else if (req.user.role === "patient") {
      userData.bloodType = roleProfile.bloodType;
      userData.allergies = roleProfile.allergies;
      userData.chronicDiseases = roleProfile.chronicDiseases;
      userData.emergencyContact = roleProfile.emergencyContact;
      userData.medicalRecordNumber = roleProfile.medicalRecordNumber;
      userData.age = roleProfile.age; // virtual field
    }
  }

  res.status(200).json({
    status: "success",
    data: { user: userData, role: req.user.role },
  });
});

// @desc    Update current user profile
// @route   PATCH /api/v1/auth/me
// @access  Private
exports.updateMe = asyncHandler(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new ApiError(
        "This route is not for password updates. Please use /change-password.",
        400
      )
    );
  }

  // 2) Update user document
  const allowedUserFields = ["phone"];
  const userUpdates = {};
  allowedUserFields.forEach((field) => {
    if (req.body[field]) userUpdates[field] = req.body[field];
  });

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  // 3) Update role-specific profile
  let roleProfile = null;
  if (req.user.role === "doctor") {
    const allowedDoctorFields = [
      "fullName",
      "gender",
      "dateOfBirth",
      "specialization",
      "qualifications",
      "yearsOfExperience",
      "availability",
    ];
    const doctorUpdates = {};
    allowedDoctorFields.forEach((field) => {
      if (req.body[field] !== undefined) doctorUpdates[field] = req.body[field];
    });

    if (req.body.fullName) {
      doctorUpdates.slug = slugify(req.body.fullName, { lower: true });
    }

    if (Object.keys(doctorUpdates).length > 0) {
      roleProfile = await Doctor.findOneAndUpdate(
        { user: req.user._id },
        doctorUpdates,
        { new: true }
      );
    }
  } else if (req.user.role === "patient") {
    const allowedPatientFields = [
      "fullName",
      "gender",
      "dateOfBirth",
      "bloodType",
      "allergies",
      "chronicDiseases",
      "emergencyContact",
    ];
    const patientUpdates = {};
    allowedPatientFields.forEach((field) => {
      if (req.body[field] !== undefined)
        patientUpdates[field] = req.body[field];
    });

    if (Object.keys(patientUpdates).length > 0) {
      roleProfile = await Patient.findOneAndUpdate(
        { user: req.user._id },
        patientUpdates,
        { new: true }
      );
    }
  }

  // 4) Get updated user
  const updatedUser = await User.findById(req.user._id);
  if (!roleProfile) {
    if (req.user.role === "doctor") {
      roleProfile = await Doctor.findOne({ user: req.user._id });
    } else if (req.user.role === "patient") {
      roleProfile = await Patient.findOne({ user: req.user._id });
    }
  }

  const userData = {
    _id: updatedUser._id,
    fullName: (roleProfile && roleProfile.fullName) || updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone,
  };

  if (roleProfile) {
    userData.gender = roleProfile.gender;
    userData.dateOfBirth = roleProfile.dateOfBirth;
  }

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: { user: userData },
  });
});

// @desc    Change password
// @route   PATCH /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user._id).select("+password");

  // 2) Check if current password is correct
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
    return next(new ApiError("Your current password is incorrect", 400));
  }

  // 3) If so, update password
  user.password = req.body.newPassword; // Let User model middleware handle hashing
  user.passwordChangedAt = new Date();
  await user.save();

  // 4) Log user in, send JWT
  const token = createToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password changed successfully",
    data: {
      token,
      user: { _id: user._id, email: user.email, role: user.role },
    },
  });
});

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
// exports.logout = asyncHandler(async (req, res, next) => {
//   res.status(200).json({
//     status: "success",
//     message:
//       "Logout successful. Please remove the token from client-side storage.",
//   });
// });

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`There is no user with that email ${req.body.email}`, 404)
    );
  }
  // 2) If user exist, Generate hash reset random 6 digits and save it in db
  const resetCode = generateResetCode();
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  // Save hashed password reset code into db
  user.passwordResetCode = hashedResetCode;
  // Add expiration time for password reset code (10 min)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  // 3) Send the reset code via email
  const message = `Hi ${user.name},\n We received a request to reset the password on your ${APP_NAME} Account. \n ${resetCode} \n Enter this code to complete the reset. \n Thanks for helping us keep your account secure.\n The ${APP_NAME} Team`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code (valid for 10 min)",
      message,
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();
    return next(new ApiError("There is an error in sending email", 500));
  }

  res
    .status(200)
    .json({ status: "Success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  const user = await User.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ApiError("Reset code invalid or expired"));
  }

  // 2) Reset code valid
  user.passwordResetVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`There is no user with email ${req.body.email}`, 404)
    );
  }

  // 2) Check if reset code verified
  if (!user.passwordResetVerified) {
    return next(new ApiError("Reset code not verified", 400));
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;

  await user.save();

  // 3) if everything is ok, generate token
  const token = createToken(user._id);
  res.status(200).json({ token });
});
