import mongoose from "mongoose";
import dotenv from 'dotenv';
import RoleModel from "./models/role.js";
import connectDB from "./config/db.js";
import EmployeeModel from "./models/employee.js";
import PostOfficeModel from "./models/postOffice.js";
import ShipperZone from "./models/shipperZone.js";
import ShipperDetailModel from "./models/shipperDetail.js";

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

// 2. TẠO STAFF THEO POST OFFICE
// ======================
const seedStaff = async () => {
  await connectDB();

  //-- 2.1 Tìm role staffOffice --
  const staffRole = await RoleModel.findOne({ name: "staffOffice" });
  if (!staffRole) {
    console.error("❌ ROLE 'staffOffice' chưa có trong database!");
    process.exit(1);
  }

  console.log("👉 ROLE STAFF:", staffRole.id);

  //-- 2.2 Lấy danh sách bưu cục --
  const offices = await PostOfficeModel.find({});

  if (offices.length === 0) {
    console.error("❌ Không có PostOffice nào!");
    process.exit(1);
  }

  console.log("👉 Tìm thấy", offices.length, "bưu cục.");

  //-- 2.3 Generate staff cho từng bưu cục --
  for (const office of offices) {
    const staffName = `Staff - ${office.name}`;
    const staffEmail = `staff.${office.code}@gmail.com`;

    // Nếu đã có staff cho office này thì bỏ qua
    const existed = await EmployeeModel.findOne({ officeId: office._id });
    if (existed) {
      console.log(`⏭ SKIP: Đã tồn tại staff cho ${office.name}`);
      continue;
    }

    // Tạo password hash
    const password = "123123";

    const newStaff = new EmployeeModel({
      name: staffName,
      email: staffEmail,
      numberPhone: "0912345678",
      address: office.address,
      passwordHash: password,
      role: staffRole._id,
      officeId: office._id,
    });

    await newStaff.save();

    console.log(`✅ CREATED STAFF: ${staffName} | Email: ${staffEmail}`);
  }

  console.log("🎉 SEED STAFF THÀNH CÔNG!");
  process.exit(0);
};

const seedShippers = async () => {
  await connectDB();

  // 1) Lấy role shipper
  const shipperRole = await RoleModel.findOne({ name: "shipper" });
  if (!shipperRole) {
    console.error("❌ Chưa có ROLE 'shipper' trong DB!");
    process.exit(1);
  }

  console.log("👉 ROLE SHIPPER:", shipperRole.id.toString());

  // 2) Lấy tất cả bưu cục giao hàng (delivery)
  const offices = await PostOfficeModel.find({ type: "delivery_office" });

  if (offices.length === 0) {
    console.error("❌ Không có bưu cục để tạo shipper!");
    process.exit(1);
  }

  console.log(`👉 Tìm thấy ${offices.length} bưu cục hợp lệ.`);

  // 3) Duyệt từng PostOffice → mỗi wardId lấy 3 zone
  for (const office of offices) {
    if (!office.wardId) {
      console.log(`⏭ SKIP: PostOffice '${office.name}' không có wardId`);
      continue;
    }

    // 3.1 Lấy 3 zone tương ứng với wardId
    const zones = await ShipperZone.find({ wardId: office.wardId });
    if (zones.length === 0) {
      console.log(`⏭ SKIP: Không có shipperZone cho ward ${office.wardId}`);
      continue;
    }

    console.log(`👉 Ward ${office.wardId} có ${zones.length} zone.`);

    // 3.2 Tạo shipper cho từng zone
    for (const zone of zones) {
      const shipperName = `Shipper - ${office.name} - ${zone.slug}`;
      const email = `shipper.${zone.code}@gmail.com`;

      // Nếu đã có shipper cho zone này thì skip
      const existedEmployee = await EmployeeModel.findOne({
        officeId: office._id,
        role: shipperRole._id,
      });

      if (existedEmployee) {
        const existedDetail = await ShipperDetailModel.findOne({
          employeeId: existedEmployee._id,
          shipperZoneId: zone._id,
        });

        if (existedDetail) {
          console.log(`⏭ SKIP: Đã tồn tại shipper cho zone ${zone.slug}`);
          continue;
        }
      }

      // Tạo password
      const rawPass = "123123";

      // 3.3 Tạo Employee shipper
      const newShipper = new EmployeeModel({
        name: shipperName,
        email,
        numberPhone: "0938123456",
        address: office.address,
        passwordHash: rawPass,
        role: shipperRole._id,
        officeId: office._id,
      });

      await newShipper.save();

      // 3.4 Tạo ShipperDetail tương ứng
      const detail = new ShipperDetailModel({
        employeeId: newShipper._id,
        vehicleType: "bike",
        shipperZoneId: zone._id,
        status: true,
      });

      await detail.save();

      console.log(
        `✅ CREATED SHIPPER: ${shipperName} (${zone.slug}) | Email: ${email}`
      );
    }
  }

  console.log("🎉 SEED SHIPPER HOÀN TẤT!");
  process.exit(0);
};

const seedShipperTruck = async () => {
  await connectDB();

  // 1) Lấy role shipper
  const shipperRole = await RoleModel.findOne({ name: "shipper" });
  if (!shipperRole) {
    console.error("❌ ROLE 'shipper' không tồn tại!");
    process.exit(1);
  }

  console.log("👉 ROLE SHIPPER:", shipperRole.id.toString());

  // 2) Lấy các bưu cục giao hàng (delivery_office)
  const offices = await PostOfficeModel.find({ type: "distribution_hub" });

  if (offices.length === 0) {
    console.error("❌ Không có bưu cục delivery_office nào!");
    process.exit(1);
  }

  console.log(`👉 Tìm thấy ${offices.length} delivery offices.`);

  // 3) Tạo shipper truck cho từng PostOffice
  for (const office of offices) {
    const email = `truck.${office.code}@gmail.com`;

    // Check nếu bưu cục đã có shipper truck → bỏ qua
    const existedTruck = await ShipperDetailModel.findOne({
      vehicleType: "truck",
    }).populate({
      path: "employeeId",
      match: { officeId: office._id },
    });

    if (existedTruck && existedTruck.employeeId) {
      console.log(`⏭ SKIP: '${office.name}' đã có shipper truck.`);
      continue;
    }

    // Tạo password hash
    const passwordHash = "123456";

    // 3.1 Tạo Employee
    const newEmp = await EmployeeModel.create({
      name: `Shipper Truck - ${office.name}`,
      email,
      numberPhone: "0900000000",
      address: office.address,
      passwordHash,
      role: shipperRole._id,
      officeId: office._id,
    });

    // 3.2 Tạo ShipperDetail (vehicleType = truck, không có zone)
    await ShipperDetailModel.create({
      employeeId: newEmp._id,
      vehicleType: "truck",
      status: true,
    });

    console.log(
      `🚚 CREATED SHIPPER TRUCK: ${newEmp.name} | Email: ${email}`
    );
  }

  console.log("🎉 SEED SHIPPER TRUCK THÀNH CÔNG!");
  process.exit(0);
};

seedShipperTruck();

// seedShippers();

// seedStaff();

// seedAdmin()
// seedRoles();
