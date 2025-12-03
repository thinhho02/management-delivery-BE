import EmployeeModel from "@/models/employee.js";
import PostOfficeModel from "@/models/postOffice.js";
import RoleModel from "@/models/role.js";
import ShipperDetailModel from "@/models/shipperDetail.js";
import { generateStrongPassword, sendNewAccountToMail } from "@/services/employee.service.js";
import catchError from "@/utils/catchError.js";
import z from "zod";

const EmployeeInputSchema = z.object({
    name: z.string().min(1, "Tên nhân viên không được bỏ trống"),
    email: z.string()
        .min(1, { message: "Chưa điền thông tin" })
        .pipe(z.email({ message: "Định dạng email không hợp lệ" })),
    officeId: z.string().min(1, "Hãy chọn 1 bưu cục"),
    role: z.string().min(1, "Hãy chọn 1 chức vụ"),
    address: z.string().min(1, "Địa chỉ không được bỏ trống"),
    idNumber: z.string().min(1, "Số CCCD không được bỏ trống").length(12, "Số CCCD tối đa là 12 số"),
    numberPhone: z.string().min(1, "Số điện thoại không được bỏ trống").length(10, "Số điện thoại tối đa là 10 số"),
    checkEmail: z.boolean()
})

export const createNewStaff = catchError(async (req, res) => {
    const payload = EmployeeInputSchema.parse(req.body)

    if (!payload.checkEmail) {
        return res.status(400).json({
            message: "Email chưa được xác thực"
        })
    }
    const employee = await EmployeeModel.findOne({
        $or: [
            { email: payload.email },
            { numberPhone: payload.numberPhone },
            { idNumber: payload.idNumber }
        ]
    })

    if (employee) {
        return res.status(400).json({
            message: "Đã có tài khoản"
        })
    }

    const password = generateStrongPassword()

    const post = await PostOfficeModel.findById(payload.officeId)
    const staff = await RoleModel.findOne({ name: payload.role })
    if (!post) {
        return res.status(400).json({
            message: "Không tìm thấy buu cục hoạt động"
        })
    }
    if (!staff) {
        return res.status(400).json({
            message: "Không tìm thấy chức vụ nhân viên"
        })
    }

    const sendMail = await sendNewAccountToMail(payload.email, payload.name, post.name, post.address, password)
    if (!sendMail) {
        return res.status(200).json({
            message: "Không thể gửi email đến nhân viên"
        })
    }
    const newEmployee = new EmployeeModel({
        name: payload.name,
        email: payload.email,
        numberPhone: payload.numberPhone,
        idNumber: payload.idNumber,
        address: payload.address,
        passwordHash: password,
        role: staff.id,
        officeId: payload.officeId
    })

    await newEmployee.save()

    return res.status(200).json({
        message: "Tạo tài khoản thành công"
    })

})


export const createNewShipper = catchError(async (req, res) => {
    const payload = EmployeeInputSchema.parse(req.body)
    const { vehicleType, shipperZone } = req.body

    if (!payload.checkEmail) {
        return res.status(400).json({
            message: "Email chưa được xác thực"
        })
    }
    const employee = await EmployeeModel.findOne({
        $or: [
            { email: payload.email },
            { numberPhone: payload.numberPhone },
            { idNumber: payload.idNumber }
        ]
    })

    if (employee) {
        return res.status(400).json({
            message: "Đã có tài khoản"
        })
    }

    const password = generateStrongPassword()

    const post = await PostOfficeModel.findById(payload.officeId)
    const shipper = await RoleModel.findOne({ name: payload.role })
    if (!post) {
        return res.status(400).json({
            message: "Không tìm thấy buu cục hoạt động"
        })
    }
    if (!shipper) {
        return res.status(400).json({
            message: "Không tìm thấy chức vụ nhân viên"
        })
    }

    const sendMail = await sendNewAccountToMail(payload.email, payload.name, post.name, post.address, password)
    if (!sendMail) {
        return res.status(200).json({
            message: "Không thể gửi email đến nhân viên"
        })
    }
    const newEmployee = new EmployeeModel({
        name: payload.name,
        email: payload.email,
        numberPhone: payload.numberPhone,
        idNumber: payload.idNumber,
        address: payload.address,
        passwordHash: password,
        role: shipper.id,
        officeId: payload.officeId
    })

    const shipperDetail = new ShipperDetailModel({
        employeeId: newEmployee.id,
        shipperZoneId: shipperZone,
        vehicleType: vehicleType,
        status: true
    })

    await newEmployee.save()
    await shipperDetail.save()

    return res.status(200).json({
        message: "Tạo tài khoản thành công"
    })

})