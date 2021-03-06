require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");
const { graphqlHTTP } = require("express-graphql");

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");
const s3Helper = require("./util/s3");

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
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/**
 * Middleware for authenticating users.
 *
 * Add userId to request and set isAuth to true, if authenticated.
 *
 * Set isAuth to false, if not authenticated.
 */
app.use(auth);

/**
 * Middleware for handling file uploads with a PUT request to /post-image route.
 *
 * Delete old image from s3, if there is an oldKey in the request body.
 *
 * Returns the file path and key.
 *
 * User must be authenticated.
 */
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) throw new Error("Not authenticated.");

  if (!req.file) return res.status(200).json({ message: "No file provided!" });

  if (req.body.oldKey) s3Helper.deleteS3Object(req.body.oldKey);

  return res.status(201).json({
    message: "File stored",
    filePath: req.file.location,
    fileKey: req.file.key,
  });
});

/**
 * Middleware for parsing the GraphQL requests.
 */
app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) return err;

      const data = err.originalError.data;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;

      return { message: message, status: code, data: data };
    },
  })
);

/**
 * Connect to MongoDB, and listen on port 8080.
 */
mongoose
  .connect(process.env.MONGODB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(process.env.PORT || 8080);
  })
  .catch((err) => console.log(err));
