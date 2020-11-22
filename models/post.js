const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Mongoose schema for a Post model.
 */
const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageKey: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true } // automatically create timestamps -> createdAt and updatedAt
);

/**
 * Post model with mongoose schema postSchema
 */
module.exports = mongoose.model("Post", postSchema);
