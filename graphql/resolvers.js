const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

const s3Helper = require("../util/s3");

module.exports = {
  /**
   * Resolver for creating a new user.
   *
   * Use validator package to validate input.
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

  /**
   * Resolver for creating a new post.
   *
   * Validate user input.
   *
   * Creates and saves new post.
   *
   * Saves image to S3.
   *
   * Adds post to user's posts.
   *
   * Returns new post data.
   *
   * User must be authenticated.
   */
  createPost: async ({ postInput }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // Validation errors
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    )
      errors.push({ message: "Title is invalid." });

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    )
      errors.push({ message: "Content is invalid." });

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // get user
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user.");
      error.code = 401;
      throw error;
    }

    // create and save post
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      imageKey: postInput.imageKey,
      creator: user,
    });
    const createdPost = await post.save();

    // add post to user's posts
    user.posts.push(createdPost);
    await user.save();

    // return new post data
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  /**
   * Get all posts.
   *
   * Includes pagination.
   *
   * User must be authenticated.
   */
  posts: async ({ page }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    if (!page) page = 1;
    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  /**
   * Get a specific post.
   *
   * User must be authenticated.
   */
  post: async ({ id }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // get post
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found.");
      error.code = 401;
      throw error;
    }

    // return post
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  /**
   * Update a specific post.
   *
   * User must be authenticated, and creator of the post.
   *
   * Validate post input fields.
   *
   * Only saves new image url and key, if one has been sent.
   */
  updatePost: async ({ id, postInput }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // get post
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found.");
      error.code = 401;
      throw error;
    }

    // check user is one who created post
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }

    // Validation errors
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    )
      errors.push({ message: "Title is invalid." });

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    )
      errors.push({ message: "Content is invalid." });

    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // edit and save post
    // only update image fields, if there was a new one added
    post.title = postInput.title;
    post.content = postInput.content;

    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
      post.imageKey = postInput.imageKey;
    }

    const updatedPost = await post.save();

    // return post
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  /**
   * Delete a specific post.
   *
   * Only the user that created the post can delete it.
   *
   * User must be authenticated.
   *
   * Image is also removed from S3.
   *
   * Post link is removed from user.
   */
  deletePost: async ({ id }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // get post
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No post found.");
      error.code = 401;
      throw error;
    }

    // check user is one who created post
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw error;
    }

    // delete post image
    s3Helper.deleteS3Object(post.imageKey);
    await Post.findByIdAndRemove(id);

    // remove post link from user that created it
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();

    return true;
  },

  /**
   * Get details for the user that sends the request.
   *
   * User must be authenticated.
   */
  user: async (args, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // get user
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found.");
      error.code = 401;
      throw error;
    }

    // return user
    return { ...user._doc, _id: user._id.toString() };
  },

  /**
   * Update the user's status.
   *
   * User must be authenticated.
   */
  updateStatus: async ({ status }, req) => {
    // check user authentication
    if (!req.isAuth) {
      const error = new Error("Not authenticated.");
      error.code = 401;
      throw error;
    }

    // get user
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found.");
      error.code = 401;
      throw error;
    }

    // update status
    user.status = status;
    await user.save();

    // return user
    return { ...user._doc, _id: user._id.toString() };
  },
};
