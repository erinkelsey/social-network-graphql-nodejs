const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Mongoose schema for a User model.
 */
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "I am new!",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
); // automatically create timestamps -> createdAt and updatedAt)

/**
 * User model with mongoose schema userSchema
 */
module.exports = mongoose.model("User", userSchema);
