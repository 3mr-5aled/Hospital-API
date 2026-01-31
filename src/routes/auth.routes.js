const express = require("express");

const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  protect,
  allowedTo,
  getMe,
  updateMe,
  // logout,
} = require("../controllers/auth.controller");

const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require("../validators/auth.validators");

const router = express.Router();

// Public routes
router.post("/signup", signupValidator, signup);
router.post("/login", loginValidator, login);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/verifyResetCode", forgotPasswordValidator, forgotPassword);
router.patch("/reset-password/:token", resetPasswordValidator, resetPassword);

// Protected routes (require authentication)
router.use(protect); // All routes after this middleware are protected

router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/change-password", changePasswordValidator, changePassword);
// router.post("/logout", logout);

// Admin only routes
router.get("/admin/users", allowedTo("admin"), (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Admin access granted - users list endpoint",
  });
});

module.exports = router;
