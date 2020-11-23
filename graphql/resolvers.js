const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

module.exports = {
  /**
   * Resolver for creating a new user.
   *
   * User validator package to validate input.
   *
   * Checks that the email address for the new user is unique.
   *
   * Hashes password with bcrypt.
   *
   * Returns newly created user.
   */
  createUser: async ({ userInput }, req) => {
    // validation errors
    const errors = [];
    if (!validator.isEmail(userInput.email))
      errors.push({ message: "Email is invalid." });
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    )
      errors.push({ message: "Password too short." });

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // check email unique
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) throw new Error("User exists already");

    // hash password
    const hashedPassword = await bcrypt.hash(userInput.password, 12);

    // create new user
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword,
    });

    const createdUser = await user.save();

    // return new user
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },

  /**
   * Resolver for logging a user in.
   *
   * Returns JWT and userId, if email and password match.
   */
  login: async ({ email, password }) => {
    // find user
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }

    // compare password
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect.");
      error.code = 401;
      throw error;
    }

    // create jwt
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // return jwt and userId
    return { token: token, userId: user._id.toString() };
  },
};
