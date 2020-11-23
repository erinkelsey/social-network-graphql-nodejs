let io;

module.exports = {
  /**
   * Setup socket.io and save instance to io variable.
   *
   * @param httpServer the Express app server
   */
  init: (httpServer) => {
    io = require("socket.io")(httpServer);
    return io;
  },
  /**
   * Get the socket.io instance.
   *
   * @throws error if there is no current socket.io instance
   * @returns the current socket.io instance.
   */
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
