const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // Appointment Type Information (moved from AppointmentType model)
    type: {
      type: String,
      required: true,
      enum: ["consultation", "surgery", "emergency", "follow-up"],
      default: "consultation",
    },
    duration: {
      type: Number, // Duration in minutes
      default: 30,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Missed"],
      default: "Scheduled",
    },

    // Patient registrations for this appointment
    patient: [
      {
        patientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "patient",
          required: true,
        },
        registrationStatus: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: false,
        },
        approvedAt: {
          type: Date,
          required: false,
        },
        rejectionReason: {
          type: String,
          required: false,
        },
        // Patient-specific information (moved from AppointmentType)
        symptoms: {
          type: String,
          default: "",
        },
        prescriptions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Prescription",
          },
        ],
        medicalRecords: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicalRecord",
          },
        ],
      },
    ],

    // Doctor and Clinic Information
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      required: true,
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clinic",
      required: true,
    },

    // Appointment Scheduling
    date: {
      type: Date,
      required: true,
    },
    time: String,
    notes: String,
    isPaid: {
      type: Boolean,
      default: false,
    },
    NumberOfPatients: {
      type: Number,
      default: 1,
    },
    MaxNumberOfPatients: {
      type: Number,
      default: 1,
    },
    IsFull: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Set priority based on appointment type
appointmentSchema.pre("save", function (next) {
  // Set priority according to type of appointment
  if (this.isModified("type")) {
    switch (this.type) {
      case "consultation":
        this.priority = "normal";
        break;
      case "surgery":
        this.priority = "high";
        break;
      case "emergency":
        this.priority = "urgent";
        break;
      case "follow-up":
        this.priority = "low";
        break;
      default:
        this.priority = "normal";
    }
  }

  // Count only approved patients
  const approvedPatients = this.patient.filter(
    (p) => p.registrationStatus === "approved"
  ).length;

  this.NumberOfPatients = approvedPatients;

  if (this.NumberOfPatients >= this.MaxNumberOfPatients) {
    this.IsFull = true;
  } else {
    this.IsFull = false;
  }
  next();
});

// populate doctor and clinic on find
appointmentSchema.pre(/^find/, function (next) {
  this.populate({ path: "doctor", select: "fullName specialization phone" });
  this.populate({ path: "clinic", select: "name clinicNumber" });
  this.populate({
    path: "patient.patientId",
    select: "fullName email phone",
  });
  this.populate({
    path: "patient.approvedBy",
    select: "fullName email",
  });
  this.populate({
    path: "patient.prescriptions",
    select: "medication dosage instructions",
  });
  this.populate({
    path: "patient.medicalRecords",
    select: "diagnosis date notes",
  });
  next();
});

const appointmentModel = mongoose.model("appointment", appointmentSchema);
module.exports = appointmentModel;
