require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");

const app = express();

/**
 * Configure AWS SDK and S3, for uploading images.
 */
aws.config.update({ region: process.env.AWS_REGION });
const s3 = new aws.S3({ apiVersion: "2006-03-01" });

const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    cb(null, new Date().toISOString() + "_" + file.originalname);
  },
});

/**
 * File filter for uploaded files.
 *
 * Only save image files with .png/.jpg/.jpeg file types.
 */
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  )
    cb(null, true);
  cb(null, false);
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: s3Storage, fileFilter: fileFilter }).single("image")); // image is field name

/**
 * Middleware for setting headers.
 *
 * CORS, and which methods are allowed.
 */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

/**
 * Routes for app.
 */
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

/**
 * Middleware for handling errors.
 */
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

/**
 * Connect to MongoDB, and listen on port 8080.
 *
 * Setup socket.io
 */
mongoose
  .connect(process.env.MONGODB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    const server = app.listen(process.env.PORT || 8080);
    const io = require("./socket").init(server);
    io.on("connection", (socket) => {
      console.log("Client connected");
    });
  })
  .catch((err) => console.log(err));
