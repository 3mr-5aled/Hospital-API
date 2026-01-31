const ApiError = require("../utils/errors/apiError.utils");
const Doctor = require("../models/doctor.model");
const Appointment = require("../models/appointment.model");

/**
 * Doctor Service
 * Handles all business logic related to doctor management
 */
class DoctorService {
  /**
   * Get all doctors with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options (limit, page, sort)
   * @returns {Object} Doctors data with pagination info
   */
  async getAllDoctors(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = "name", sortOrder = 1 } = options;
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      const doctors = await Doctor.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-password"); // Exclude sensitive data

      const total = await Doctor.countDocuments(filter);

      return {
        doctors,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new ApiError("Failed to fetch doctors", 500);
    }
  }

  /**
   * Get doctor by ID with optional population
   * @param {string} doctorId - Doctor ID
   * @param {Array} populate - Fields to populate
   * @returns {Object} Doctor data
   */
  async getDoctorById(doctorId, populate = []) {
    try {
      let query = Doctor.findById(doctorId).select("-password");

      // Apply population if specified
      if (populate.length > 0) {
        populate.forEach((field) => {
          query = query.populate(field);
        });
      }

      const doctor = await query;

      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      return doctor;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to fetch doctor", 500);
    }
  }

  /**
   * Create new doctor
   * @param {Object} doctorData - Doctor data
   * @returns {Object} Created doctor
   */
  async createDoctor(doctorData) {
    try {
      // Check if doctor with email already exists
      if (doctorData.email) {
        const existingDoctor = await Doctor.findOne({
          email: doctorData.email.toLowerCase(),
        });

        if (existingDoctor) {
          throw new ApiError("Doctor with this email already exists", 400);
        }
      }

      // Check if doctor with phone already exists
      if (doctorData.phone) {
        const existingDoctor = await Doctor.findOne({
          phone: doctorData.phone,
        });

        if (existingDoctor) {
          throw new ApiError(
            "Doctor with this phone number already exists",
            400
          );
        }
      }

      // Check if doctor with license number already exists
      if (doctorData.licenseNumber) {
        const existingDoctor = await Doctor.findOne({
          licenseNumber: doctorData.licenseNumber,
        });

        if (existingDoctor) {
          throw new ApiError(
            "Doctor with this license number already exists",
            400
          );
        }
      }

      // Normalize email
      if (doctorData.email) {
        doctorData.email = doctorData.email.toLowerCase();
      }

      const doctor = await Doctor.create(doctorData);

      // Return doctor without sensitive data
      const { password, ...doctorWithoutPassword } = doctor.toObject(); // eslint-disable-line no-unused-vars
      return doctorWithoutPassword;
    } catch (error) {
      if (error.code === 11000) {
        // Handle MongoDB duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        throw new ApiError(`Doctor with this ${field} already exists`, 400);
      }

      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to create doctor", 500);
    }
  }

  /**
   * Update doctor by ID
   * @param {string} doctorId - Doctor ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated doctor
   */
  async updateDoctor(doctorId, updateData) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      // If updating email, check for duplicates
      if (updateData.email && updateData.email !== doctor.email) {
        const existingDoctor = await Doctor.findOne({
          email: updateData.email.toLowerCase(),
          _id: { $ne: doctorId },
        });

        if (existingDoctor) {
          throw new ApiError("Doctor with this email already exists", 400);
        }

        updateData.email = updateData.email.toLowerCase();
      }

      // If updating phone, check for duplicates
      if (updateData.phone && updateData.phone !== doctor.phone) {
        const existingDoctor = await Doctor.findOne({
          phone: updateData.phone,
          _id: { $ne: doctorId },
        });

        if (existingDoctor) {
          throw new ApiError(
            "Doctor with this phone number already exists",
            400
          );
        }
      }

      // If updating license number, check for duplicates
      if (
        updateData.licenseNumber &&
        updateData.licenseNumber !== doctor.licenseNumber
      ) {
        const existingDoctor = await Doctor.findOne({
          licenseNumber: updateData.licenseNumber,
          _id: { $ne: doctorId },
        });

        if (existingDoctor) {
          throw new ApiError(
            "Doctor with this license number already exists",
            400
          );
        }
      }

      // Remove sensitive fields from update data
      delete updateData.password;
      delete updateData.role;

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        doctorId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).select("-password");

      return updatedDoctor;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ApiError(`Doctor with this ${field} already exists`, 400);
      }

      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to update doctor", 500);
    }
  }

  /**
   * Delete doctor by ID
   * @param {string} doctorId - Doctor ID
   * @returns {boolean} Success status
   */
  async deleteDoctor(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      // Check if doctor has any future appointments
      const futureAppointments = await Appointment.find({
        doctor: doctorId,
        date: { $gte: new Date() },
      });

      if (futureAppointments.length > 0) {
        throw new ApiError(
          "Cannot delete doctor with future appointments. Please reassign or cancel appointments first.",
          400
        );
      }

      await Doctor.findByIdAndDelete(doctorId);
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to delete doctor", 500);
    }
  }

  /**
   * Search doctors by various criteria
   * @param {Object} searchCriteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Array} Matching doctors
   */
  async searchDoctors(searchCriteria, options = {}) {
    try {
      const { query, field, specialization, availability } = searchCriteria;
      const filter = {};

      if (query && field) {
        if (field === "all") {
          // Search across multiple fields
          filter.$or = [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { phone: { $regex: query, $options: "i" } },
            { specialization: { $regex: query, $options: "i" } },
            { licenseNumber: { $regex: query, $options: "i" } },
          ];
        } else {
          // Search specific field
          filter[field] = { $regex: query, $options: "i" };
        }
      }

      if (specialization) {
        filter.specialization = { $regex: specialization, $options: "i" };
      }

      if (availability !== undefined) {
        filter.isAvailable = availability;
      }

      return await this.getAllDoctors(filter, options);
    } catch (error) {
      throw new ApiError("Failed to search doctors", 500);
    }
  }

  /**
   * Get doctor's schedule and appointments
   * @param {string} doctorId - Doctor ID
   * @param {Object} options - Query options
   * @returns {Object} Doctor's schedule information
   */
  async getDoctorSchedule(doctorId, options = {}) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      const { startDate, endDate } = options;

      // Default to next 30 days if no date range specified
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const appointments = await Appointment.find({
        doctor: doctorId,
        date: { $gte: start, $lte: end },
      })
        .populate("patient.patientId", "fullName phone email")
        .sort({ date: 1, time: 1 });

      // Group appointments by date
      const schedule = {};
      appointments.forEach((appointment) => {
        const dateKey = appointment.date.toISOString().split("T")[0];
        if (!schedule[dateKey]) {
          schedule[dateKey] = [];
        }
        schedule[dateKey].push(appointment);
      });

      return {
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialization: doctor.specialization,
          isAvailable: doctor.isAvailable,
        },
        schedule,
        period: { start, end },
        totalAppointments: appointments.length,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to fetch doctor schedule", 500);
    }
  }

  /**
   * Get doctors by specialization
   * @param {string} specialization - Specialization name
   * @param {Object} options - Query options
   * @returns {Array} Doctors with specified specialization
   */
  async getDoctorsBySpecialization(specialization, options = {}) {
    try {
      const filter = {
        specialization: { $regex: specialization, $options: "i" },
        isAvailable: true, // Only return available doctors
      };

      return await this.getAllDoctors(filter, options);
    } catch (error) {
      throw new ApiError("Failed to fetch doctors by specialization", 500);
    }
  }

  /**
   * Update doctor availability status
   * @param {string} doctorId - Doctor ID
   * @param {boolean} isAvailable - Availability status
   * @returns {Object} Updated doctor
   */
  async updateDoctorAvailability(doctorId, isAvailable) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        doctorId,
        { isAvailable },
        { new: true }
      ).select("-password");

      return updatedDoctor;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to update doctor availability", 500);
    }
  }

  /**
   * Update doctor profile image
   * @param {string} doctorId - Doctor ID
   * @param {string} imagePath - Image file path
   * @returns {Object} Updated doctor
   */
  async updateDoctorImage(doctorId, imagePath) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        doctorId,
        { profileImg: imagePath },
        { new: true }
      ).select("-password");

      return updatedDoctor;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to update doctor image", 500);
    }
  }

  /**
   * Get doctor statistics
   * @param {string} doctorId - Optional doctor ID for individual stats
   * @returns {Object} Doctor statistics
   */
  async getDoctorStatistics(doctorId = null) {
    try {
      if (doctorId) {
        // Individual doctor statistics
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          throw new ApiError("Doctor not found", 404);
        }

        const totalAppointments = await Appointment.countDocuments({
          doctor: doctorId,
        });

        const completedAppointments = await Appointment.countDocuments({
          doctor: doctorId,
          date: { $lt: new Date() },
        });

        const upcomingAppointments = await Appointment.countDocuments({
          doctor: doctorId,
          date: { $gte: new Date() },
        });

        return {
          doctor: {
            id: doctor._id,
            name: doctor.name,
            specialization: doctor.specialization,
          },
          appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            upcoming: upcomingAppointments,
          },
        };
      }

      // Overall doctor statistics
      const totalDoctors = await Doctor.countDocuments();
      const availableDoctors = await Doctor.countDocuments({
        isAvailable: true,
      });

      // Get specialization distribution
      const specializationStats = await Doctor.aggregate([
        {
          $group: {
            _id: "$specialization",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return {
        total: totalDoctors,
        available: availableDoctors,
        unavailable: totalDoctors - availableDoctors,
        specializations: specializationStats,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to fetch doctor statistics", 500);
    }
  }

  /**
   * Get available time slots for a doctor on a specific date
   * @param {string} doctorId - Doctor ID
   * @param {Date} date - Date to check
   * @returns {Array} Available time slots
   */
  async getAvailableTimeSlots(doctorId, date) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError("Doctor not found", 404);
      }

      if (!doctor.isAvailable) {
        return [];
      }

      // Get existing appointments for the date
      const existingAppointments = await Appointment.find({
        doctor: doctorId,
        date: new Date(date),
      });

      // Define standard time slots (could be moved to doctor model or configuration)
      const standardTimeSlots = [
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
      ];

      // Filter out booked slots
      const bookedSlots = existingAppointments.map((apt) => apt.time);
      const availableSlots = standardTimeSlots.filter(
        (slot) => !bookedSlots.includes(slot)
      );

      return availableSlots;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to fetch available time slots", 500);
    }
  }
}

module.exports = new DoctorService();
