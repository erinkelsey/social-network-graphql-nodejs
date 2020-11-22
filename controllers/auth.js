const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

/**
 * Controller for signing up a user.
 *
 * Checks for validation errors.
 *
 * Hashes and salts the user's password.
 *
 * Adds the new user to the db, and returns the new user ID.
 */
exports.signup = (req, res, next) => {
  // Validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed. Entered data is incorrect.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  bcrypt
    .hash(req.body.password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: hashedPassword,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({ message: "User created!", userId: result._id });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for logging a user into app.
 *
 * Checks that the email, password combination match.
 *
 * If they match, create and return a JWT for the user.
 */
exports.login = (req, res, next) => {
  let loadedUser;
  // validate email
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not be found.");
        error.statusCode = 401;
        throw error;
      }

      loadedUser = user;
      // validate password
      return bcrypt.compare(req.body.password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password.");
        error.statusCode = 401;
        throw error;
      }

      // create JWT
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for getting the status of the user.
 */
exports.getUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ status: user.status });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

/**
 * Controller for updating the status of the user.
 */
exports.updateUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
      }
      user.status = req.body.status;
      return user.save();
    })
    .then(() => {
      res.status(200).json({ message: "User updated." });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
