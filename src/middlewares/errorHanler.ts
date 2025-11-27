import { AppThrowError } from "@/utils/AppThrowError.js";
import type { ErrorRequestHandler } from "express";
import { z } from "zod";


const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(`Path: ${req.path}`, error);

  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: "Invalid input",
    })
  }
  if (error instanceof AppThrowError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }
  // Các lỗi Mongo như Duplicate key
  if (error.code === 11000) {
    return res.status(400).json({
      message: "Dữ liệu đã tồn tại",
    });
  }
  res.status(500).json({
    message: "Internal server error",
  });
};

export default errorHandler;