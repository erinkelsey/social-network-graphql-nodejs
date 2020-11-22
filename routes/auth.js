const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");

const User = require("../models/user");

const router = express.Router();

/**
 * PUT method for /signup route.
 *
 * Signup a new user.
 *
 * Validates on the following:
 *  - email -> must be valid email, that is not already in the db
 *  ** also normalizes email
 *  - password -> min 5 chars
 *  - name -> is not empty
 */
router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) return Promise.reject("Email address already exists.");
        });
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);

/**
 * POST method for /login route.
 *
 * Logins in a user.
 */
router.post("/login", authController.login);

/**
 * GET method for /status route.
 *
 * Gets the status of the user.
 */
router.get("/status", isAuth, authController.getUserStatus);

/**
 * PATCH method for /status route.
 *
 * Updates the status of the user.
 */
router.patch(
  "/status",
  isAuth,
  [body("status").trim().not().isEmpty()],
  authController.updateUserStatus
);

module.exports = router;
