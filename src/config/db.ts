import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const uri = (process.env.MONGO_CONNECTION_DB as string);
    if (uri == "") {
      throw new Error("Error connecting to MongoDB")
    }
    await mongoose.connect(uri);
    console.log("MongoDB connected!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
