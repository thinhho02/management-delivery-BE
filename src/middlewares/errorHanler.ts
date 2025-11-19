import type { ErrorRequestHandler } from "express";
import { z } from "zod";


const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(`Path: ${req.path}`, error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: "Invalid input",
    })
  } else {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export default errorHandler;