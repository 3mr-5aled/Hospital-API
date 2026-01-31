const mongoose = require("mongoose");

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Clinic name is required"],
      unique: true,
      trim: true,
    },
    clinicNumber: {
      type: String,
      unique: true,
      required: [true, "Clinic number is required"],
      trim: true,
    },
    description: String,
    floor: String,
    roomNumber: String,
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "doctor",
      },
    ],
  },
  { timestamps: true }
);

const clinicModel = mongoose.model("clinic", clinicSchema);
module.exports = clinicModel;
