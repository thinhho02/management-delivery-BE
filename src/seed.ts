import mongoose from "mongoose";
import dotenv from 'dotenv';
import RoleModel from "./models/role.js";
import connectDB from "./config/db.js";
import EmployeeModel from "./models/employee.js";

// environment config
dotenv.config();

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
  },
  {
    name: "adminOffice",
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

async function seedAdmin() {
  try {
    await connectDB();
    const roleId = new mongoose.Types.ObjectId("691b02d482e9520650bac8ed");

    // Kiểm tra xem admin đã tồn tại chưa
    const exists = await EmployeeModel.findOne({ email: "admin@gmail.com" });
    if (exists) {
      console.log("Admin employee đã tồn tại!");
      return process.exit(0);
    }

    const password = "123456"

    const admin = new EmployeeModel({
      name: "Quản lý hệ thống",
      email: "admin@system.com",
      numberPhone: "0900000000",
      address: "Hệ thống",
      passwordHash: password,
      status: true,
      role: roleId,
      officeId: null
    });

    await admin.save()

    console.log("✔ Admin employee đã được tạo:");
    console.log(admin);
  } catch (err) {
    console.error("Lỗi seed admin:", err);
  } finally {
    mongoose.connection.close();
  }
}
seedAdmin()
// seedRoles();
