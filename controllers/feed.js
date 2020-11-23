const { validationResult } = require("express-validator");

const s3Helper = require("../util/s3");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

/**
 * Controller for getting all of the posts.
 *
 * Includes pagination.
 */
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .skip((currentPage - 1) * perPage)
      .sort({ createdAt: -1 }) // desc
      .limit(2);

    res.status(200).json({
      message: "Fetched posts successfully.",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

/**
 * Controller for creating a new post.
 *
 * Checks for validation errors.
 *
 * Saves new post to mongodb. User who created post is linked to it.
 *
 * Returns the new post, if successful.
 *
 * Emits the post to all of the clients that are currently connected through
 * websocket on the posts channel with a create action.
 */
exports.createPost = (req, res, next) => {
  // Validation and image errors.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed. Entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }

  // Save new post.
  let savedPost;
  let creator;
  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.file.location,
    imageKey: req.file.key,
    creator: req.userId,
  });
  post
    .save()
    .then((result) => {
      savedPost = result;
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      user.save();
    })
    .then(() => {
      io.getIO().emit("posts", {
        action: "create",
        post: {
          ...savedPost._doc,
          creator: { _id: req.userId, name: creator.name },
        },
      });

      res.status(201).json({
        message: "Post created successfully!",
        post: savedPost,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for getting a specific post.
 */
exports.getPost = (req, res, next) => {
  Post.findById(req.params.postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ message: "Post fetched", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for updating a specific post.
 *
 * Checks for validation errors.
 *
 * Only the user that created the post can update it.
 *
 * Deletes previous image from S3, if new one is added.
 *
 * Emits the updated post to all of the clients that are currently connected through
 * websocket on the posts channel with a update action.
 */
exports.updatePost = (req, res, next) => {
  // Validation and file errors.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed. Entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  let imageUrl = req.body.image;
  if (req.file) imageUrl = req.file.location;

  if (!imageUrl) {
    const error = new Error("No image picked.");
    error.statusCode = 422;
    throw error;
  }

  // Update post
  Post.findById(req.params.postId)
    .populate("creator")
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 422;
        throw error;
      }

      // validate is one of this user's posts
      if (post.creator._id.toString() !== req.userId) {
        const error = new Error("Not authorized.");
        error.statusCode = 403;
        throw error;
      }

      // delete previous image, if new one selected
      if (imageUrl !== post.imageUrl) {
        s3Helper.deleteS3Object(post.imageKey);
        post.imageKey = req.file.key;
      }
      post.title = req.body.title;
      post.imageUrl = imageUrl;
      post.content = req.body.content;

      return post.save();
    })
    .then((result) => {
      io.getIO().emit("posts", { action: "update", post: result });
      res.status(200).json({
        message: "Post updated!",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for deleting a specific post.
 *
 * Only the user that created the post can delete it.
 *
 * Removes reference from user object of the post.
 *
 * Deletes post from mongodb and post's image from S3.
 *
 * Emits to all of the clients that are currently connected through
 * websocket on the posts channel that a post has been deleted
 * with a delete action.
 */
exports.deletePost = (req, res, next) => {
  Post.findById(req.params.postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 422;
        throw error;
      }

      // validate is one of this user's posts
      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not authorized.");
        error.statusCode = 403;
        throw error;
      }

      // delete image and post object
      s3Helper.deleteS3Object(post.imageKey);
      return Post.findByIdAndRemove(req.params.postId);
    })
    .then(() => {
      return User.findById(req.userId);
    })
    .then((user) => {
      // remove post from user
      user.posts.pull(req.params.postId);
      return user.save();
    })
    .then(() => {
      io.getIO().emit("posts", { action: "delete", post: req.params.postId });
      res.status(200).json({ message: "Deleted post." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
