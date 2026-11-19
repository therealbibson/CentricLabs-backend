// Wrap an async route handler so rejected promises reach the error
// handler instead of hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Final error handler — must be mounted after all routes in app.js.
 // eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}

module.exports = { asyncHandler, errorHandler };
