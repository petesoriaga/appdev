export const notFound = (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
};

export const errorHandler = (error, _req, res, _next) => {
  const status = error.statusCode || error.status || 500;
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Upload payload is too large for the current server path."
    });
  }
  if (String(error?.code || "").startsWith("LIMIT_")) {
    return res.status(413).json({
      success: false,
      message: error.message || "Upload exceeded server multipart limits."
    });
  }
  res.status(status).json({
    success: false,
    message: error.message || "Internal server error"
  });
};
