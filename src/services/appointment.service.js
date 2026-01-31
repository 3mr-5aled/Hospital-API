const ApiError = require("../utils/errors/apiError.utils");
const Appointment = require("../models/appointment.model");
const Patient = require("../models/patient.model");
const Doctor = require("../models/doctor.model");

/**
 * Appointment Service
 * Handles all business logic related to appointment management
 */
class AppointmentService {
  /**
   * Get all appointments with filtering
   * @param {Object} filter - Filter criteria
   * @returns {Array} List of appointments
   */
  async getAllAppointments(filter = {}) {
    try {
      const appointments = await Appointment.find(filter)
        .populate("doctor", "fullName specialization")
        .populate("patient.patientId", "fullName email phone")
        .sort({ priority: 1, date: 1 });

      return appointments;
    } catch (error) {
      throw new ApiError("Failed to fetch appointments", 500);
    }
  }

  /**
   * Get appointments with only approved patients (public view)
   * @param {Object} filter - Filter criteria
   * @returns {Array} Appointments with approved patients only
   */
  async getApprovedAppointments(filter = {}) {
    try {
      const appointments = await Appointment.find(filter).sort({
        priority: 1,
        date: 1,
      });

      // Filter to show only approved patients in each appointment
      const appointmentsWithApproved = appointments.map((appointment) => {
        const approvedPatients = appointment.patient.filter(
          (p) => p.registrationStatus === "approved"
        );

        return {
          ...appointment.toObject(),
          patient: approvedPatients,
          NumberOfPatients: approvedPatients.length,
          IsFull: approvedPatients.length >= appointment.MaxNumberOfPatients,
        };
      });

      return appointmentsWithApproved;
    } catch (error) {
      throw new ApiError("Failed to fetch approved appointments", 500);
    }
  }

  /**
   * Create new appointment
   * @param {Object} appointmentData - Appointment data
   * @returns {Object} Created appointment
   */
  async createAppointment(appointmentData) {
    try {
      // Validate doctor exists
      if (appointmentData.doctor) {
        const doctor = await Doctor.findById(appointmentData.doctor);
        if (!doctor) {
          throw new ApiError("Doctor not found", 404);
        }
      }

      // Check for appointment conflicts
      await this.checkAppointmentConflicts(
        appointmentData.doctor,
        appointmentData.date,
        appointmentData.time
      );

      const appointment = await Appointment.create(appointmentData);
      return appointment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to create appointment", 500);
    }
  }

  /**
   * Update appointment
   * @param {string} appointmentId - Appointment ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated appointment
   */
  async updateAppointment(appointmentId, updateData) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new ApiError("Appointment not found", 404);
      }

      // If updating doctor or time, check for conflicts
      if (updateData.doctor || updateData.date || updateData.time) {
        const doctorId = updateData.doctor || appointment.doctor;
        const date = updateData.date || appointment.date;
        const time = updateData.time || appointment.time;

        await this.checkAppointmentConflicts(
          doctorId,
          date,
          time,
          appointmentId
        );
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedAppointment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to update appointment", 500);
    }
  }

  /**
   * Delete appointment
   * @param {string} appointmentId - Appointment ID
   * @returns {boolean} Success status
   */
  async deleteAppointment(appointmentId) {
    try {
      const appointment = await Appointment.findByIdAndDelete(appointmentId);
      if (!appointment) {
        throw new ApiError("Appointment not found", 404);
      }
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to delete appointment", 500);
    }
  }

  /**
   * Add patient to appointment
   * @param {string} appointmentId - Appointment ID
   * @param {string} patientId - Patient ID
   * @param {Object} registrationData - Registration data
   * @returns {Object} Updated appointment
   */
  async addPatientToAppointment(
    appointmentId,
    patientId,
    registrationData = {}
  ) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new ApiError("Appointment not found", 404);
      }

      // Check if appointment is full
      const approvedPatients = appointment.patient.filter(
        (p) => p.registrationStatus === "approved"
      );

      if (approvedPatients.length >= appointment.MaxNumberOfPatients) {
        throw new ApiError("Appointment is full", 400);
      }

      // Check if patient already registered
      const existingRegistration = appointment.patient.find(
        (p) => p.patientId.toString() === patientId
      );

      if (existingRegistration) {
        throw new ApiError(
          "Patient already registered for this appointment",
          400
        );
      }

      // Validate patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new ApiError("Patient not found", 404);
      }

      // Add patient to appointment
      appointment.patient.push({
        patientId,
        registrationStatus: registrationData.status || "pending",
        registrationDate: new Date(),
        ...registrationData,
      });

      await appointment.save();
      return appointment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to add patient to appointment", 500);
    }
  }

  /**
   * Update patient registration status
   * @param {string} appointmentId - Appointment ID
   * @param {string} patientId - Patient ID
   * @param {string} status - New status
   * @returns {Object} Updated appointment
   */
  async updatePatientStatus(appointmentId, patientId, status) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new ApiError("Appointment not found", 404);
      }

      const patientIndex = appointment.patient.findIndex(
        (p) => p.patientId.toString() === patientId
      );

      if (patientIndex === -1) {
        throw new ApiError("Patient not registered for this appointment", 404);
      }

      appointment.patient[patientIndex].registrationStatus = status;
      await appointment.save();

      return appointment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to update patient status", 500);
    }
  }

  /**
   * Check for appointment time conflicts
   * @param {string} doctorId - Doctor ID
   * @param {Date} date - Appointment date
   * @param {string} time - Appointment time
   * @param {string} excludeAppointmentId - Exclude specific appointment from conflict check
   * @private
   */
  async checkAppointmentConflicts(
    doctorId,
    date,
    time,
    excludeAppointmentId = null
  ) {
    try {
      const query = {
        doctor: doctorId,
        date: date,
        time: time,
      };

      if (excludeAppointmentId) {
        query._id = { $ne: excludeAppointmentId };
      }

      const conflictingAppointment = await Appointment.findOne(query);

      if (conflictingAppointment) {
        throw new ApiError(
          "Doctor already has an appointment at this time",
          409
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Failed to check appointment conflicts", 500);
    }
  }

  /**
   * Get appointments by doctor
   * @param {string} doctorId - Doctor ID
   * @param {Object} options - Query options
   * @returns {Array} Doctor's appointments
   */
  async getAppointmentsByDoctor(doctorId, options = {}) {
    try {
      const { startDate, endDate } = options;

      const query = { doctor: doctorId };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const appointments = await Appointment.find(query)
        .populate("patient.patientId", "fullName email phone")
        .sort({ date: 1, time: 1 });

      return appointments;
    } catch (error) {
      throw new ApiError("Failed to fetch doctor appointments", 500);
    }
  }

  /**
   * Get appointments by patient
   * @param {string} patientId - Patient ID
   * @returns {Array} Patient's appointments
   */
  async getAppointmentsByPatient(patientId) {
    try {
      const appointments = await Appointment.find({
        "patient.patientId": patientId,
      })
        .populate("doctor", "fullName specialization")
        .sort({ date: 1, time: 1 });

      return appointments;
    } catch (error) {
      throw new ApiError("Failed to fetch patient appointments", 500);
    }
  }
}

module.exports = new AppointmentService();
