import ShipperDetailModel from "@/models/shipperDetail.js";
import ShipperTaskModel from "@/models/shipperTask.js";
import { io } from "@/socket/index.js";
import catchError from "@/utils/catchError.js";


export const getInfoShipper = catchError(async (req, res) => {
    const employeeId = (req as any).user.id

    const shipperId = req.params.shipperId

    const shipper = await ShipperDetailModel.findById(shipperId).populate("employeeId", "_id name email numberPhone").lean()

    if (!shipper || shipper.employeeId._id.toString() !== employeeId) {
        return res.status(403).json({
            message: "Không tìm thấy shipper"
        })
    }

    return res.status(200).json({ shipper })
})


export const getInfoShipperByEmployee = catchError(async (req, res) => {
    console.log(123123123)
    const employeeId = (req as any).user.id

    if (!employeeId) {
        return res.status(403).json({
            message: "Không tìm thấy tài khoản"
        })
    }
    console.log(employeeId)
    const shipperDetail = await ShipperDetailModel.findOne({ employeeId }).populate("employeeId", "_id name email numberPhone").lean()

    if (!shipperDetail) {
        return res.status(403).json({
            message: "Không tìm thấy shipper"
        })
    }

    return res.status(200).json(shipperDetail)

})


export const updateLocationShipper = catchError(async (req, res) => {
    const shipperId = req.params.shipperId

    const { location } = req.body

    if (!shipperId) {
        return res.status(403).json({
            message: "Không tìm thấy tài khoản"
        })
    }

    if (!location || location.type !== "Point") {
        return res.status(400).json({
            message: "Không thể cập nhật vị trí"
        })
    }

    await ShipperDetailModel.findByIdAndUpdate(shipperId, { location }, { new: true })

    const tasks = await ShipperTaskModel.find({
        shipperDetailId: shipperId,
        type: "delivery",
        status: "in_progress"
    })
        .select("orderId")
        .lean();

    for (const task of tasks) {
        const orderId = task.orderId.toString();
        io.to(`order:${orderId}`).emit("tracking:location", location.coordinates)
    }

    return res.status(204).json({})
})