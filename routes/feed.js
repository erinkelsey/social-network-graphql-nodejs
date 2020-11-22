const express = require("express");
const { body } = require("express-validator");

const feedController = require("../controllers/feed");

const router = express.Router();

/**
 * GET method for /feed/posts route.
 *
 * Gets all of the posts.
 */
router.get("/posts", feedController.getPosts);

/**
 * POST method for /feed/post route.
 *
 * Create a new post.
 *
 * Validates the incoming fields.
 */
router.post(
  "/post",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.createPost
);

/**
 * GET method for /feed/post/:postId route.
 *
 * Get all of the details for a specific post.
 */
router.get("/post/:postId", feedController.getPost);

/**
 * PUT method for /feed/post/:postId route.
 *
 * Replace a specific post with a new version.
 *
 * Validates the incoming fields.
 */
router.put(
  "/post/:postId",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.updatePost
);

/**
 * DELETE method for /feed/post/:postId route.
 *
 * Deletes a specific post.
 */
router.delete("/post/:postId", feedController.deletePost);

module.exports = router;
