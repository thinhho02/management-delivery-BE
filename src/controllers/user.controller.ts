import BusinessModel from "@/models/business.js";
import UserModel from "@/models/user.js";
import catchError from "@/utils/catchError.js";
import z from "zod";


const UserInputSchema = z.object({
    name: z.string().min(1, "Tên nhân viên không được bỏ trống"),
    email: z.string()
        .min(1, { message: "Chưa điền thông tin" })
        .pipe(z.email({ message: "Định dạng email không hợp lệ" })),
    checkEmail: z.boolean(),
    numberPhone: z.string().min(1, "Số điện thoại không được bỏ trống").length(10, "Số điện thoại tối đa là 10 số"),
    address: z.string().min(1, "Địa chỉ không được bỏ trống"),
    business: z.string().min(1, "Không tìm thầy doanh nghiệp"),
    location: z.array(z.number()).optional(),
    default: z.boolean(),
    type: z.enum(["customer", "seller"])
})


export const getUserDefaultByBusiness = catchError(async (req, res) => {
    // const pickInput = UserInputSchema.pick({business: true, default: true})
    const businessId = (req as any).user.id

    const userDefault = await UserModel.findOne({
        business: businessId,
        default: true
    }).populate([
        { path: "provinceId", select: "_id name code" },
        { path: "wardId", select: "_id name code" }
    ])

    if (!userDefault) {
        return res.status(400).json({
            message: "Không tìm thấy"
        })
    }

    return res.status(200).json(userDefault)
})


export const updateUserDefault = catchError(async (req, res) => {
    const {
        name,
        email,
        numberPhone,
        provinceId,
        wardId,
        address,
        location,
        checkEmail
    } = req.body;

    const businessId = (req as any).user.id;
    const business = await BusinessModel.findById(businessId)
    if (!business) {
        return res.status(400).json({
            message: "Không tìm thấy doanh nghiệp"
        })
    }
    // Nếu email tồn tại → bắt buộc checkEmail phải true


    // Tìm user default
    const userDefault = await UserModel.findOne({
        business: businessId,
        default: true
    });
    if(email && userDefault && email !== userDefault.email){
        if (!checkEmail) {
            return res.status(400).json({
                message: "Bạn chưa kiểm tra email"
            });
        }
    }
    // Nếu email có → check trùng email
    if (email) {
        const findUser = await UserModel.findOne({
            email,
            type: "seller",
            business: businessId
        });

        if (findUser && (!userDefault || findUser.id !== userDefault.id)) {
            return res.status(400).json({
                message: "Email này đã được sử dụng"
            });
        }
    }

    // Update user default nếu tồn tại
    if (userDefault) {
        await UserModel.updateOne(
            { _id: userDefault._id },
            {
                $set: {
                    name,
                    numberPhone,
                    provinceId,
                    wardId,
                    address,
                    email: email || business.email,  // Nếu email rỗng → xóa email
                    location: {
                        type: "Point",
                        coordinates: location
                    }
                }
            }
        );
    }
    // Nếu chưa có user default → tạo mới
    else {
        const newUserDefault = new UserModel({
            type: "seller",
            default: true,
            business: businessId,
            name,
            provinceId,
            wardId,
            numberPhone,
            address,
            email: email || business.email,
            location: {
                type: "Point",
                coordinates: location
            }
        });

        await newUserDefault.save();
    }

    return res.status(200).json({
        message: "Cập nhật thành công"
    });
});

