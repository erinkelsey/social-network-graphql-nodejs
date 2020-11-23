const jwt = require("jsonwebtoken");

/**
 * Checks if there is an Authorization Header.
 *
 * If there is a header, decode and verify a JWT token.
 * And extract the userId, and add to request, and set
 * isAuth on request to true.
 *
 * If there is no header, set isAuth on request to false.
 */
module.exports = (req, res, next) => {
  // check for auth header
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;
    return next();
  }

  // decode and verify token
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    req.isAuth = false;
    return next();
  }

  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  // add userId to request
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
