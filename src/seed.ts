import mongoose from "mongoose";
import dotenv from 'dotenv';
import RoleModel from "./models/role.js";
import connectDB from "./config/db.js";

// environment config
dotenv.config({
    path: `.env.${process.env.NODE_ENV}`
});

const roles = [
  {
    name: "business",
  },
  {
    name: "admin",
  },
  {
    name: "shipper",
  },
  {
    name: "staffOffice",
  }
];

async function seedRoles() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();

    console.log("🌱 Start seeding roles...");

    for (const role of roles) {
      const exists = await RoleModel.findOne({ name: role.name });

      if (!exists) {
        await RoleModel.create(role);
        console.log(`✔ Created role: ${role.name}`);
      } else {
        console.log(`⚠ Role already exists: ${role.name}`);
      }
    }

    console.log("🎉 Seeding completed!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding roles:", err);
    process.exit(1);
  }
}

seedRoles();
