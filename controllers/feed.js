const { validationResult } = require("express-validator");

const s3Helper = require("../util/s3");

const Post = require("../models/post");

/**
 * Controller for getting all of the posts.
 *
 * Includes pagination.
 */
exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      res.status(200).json({
        message: "Fetched posts successfully.",
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

/**
 * Controller for creating a new post.
 *
 * Checks for validation errors.
 *
 * Saves new post to mongodb.
 *
 * Returns the new post, if successful.
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
  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.file.location,
    imageKey: req.file.key,
    creator: { name: "Erin" },
  });
  post
    .save()
    .then((result) => {
      res.status(201).json({
        message: "Post created successfully!",
        post: result,
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
 * Deletes previous image from S3, if new one is added.
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
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 422;
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
 * Deletes post from mongodb and post's image from S3.
 */
exports.deletePost = (req, res, next) => {
  Post.findById(req.params.postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 422;
        throw error;
      }
      // check logged in user
      s3Helper.deleteS3Object(post.imageKey);
      return Post.findByIdAndRemove(req.params.postId);
    })
    .then(() => {
      res.status(200).json({ message: "Deleted post." });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
