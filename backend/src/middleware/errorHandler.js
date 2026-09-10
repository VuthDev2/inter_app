export function errorHandler(err, req, res, next) {
  console.error("[Error Handler]", err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      ok: false,
      error: "Validation failed.",
      details: err.errors,
    });
  }

  if (err.status && err.message) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }

  return res.status(500).json({ ok: false, error: "Internal server error." });
}
