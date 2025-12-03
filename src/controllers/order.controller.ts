import OrderModel from "@/models/order.js";
import PostOfficeModel from "@/models/postOffice.js";
import UserModel from "@/models/user.js";
import { buildLabelHtml, buildValueHtml, generateRoutePlan, getBestPostOffice, maskPhone, sendOrderSuccessEmail, validateOfficeRoute } from "@/services/order.service.js";
import catchError from "@/utils/catchError.js";
import mongoose from "mongoose";
import z from "zod";
import QRCode from "qrcode";
import puppeteer from "puppeteer";
import ShipperZone from "@/models/shipperZone.js";
import ShipperDetailModel from "@/models/shipperDetail.js";
import ShipperTaskModel from "@/models/shipperTask.js";


const SchemaInputOrder = z.object({
    pick: z.enum(["pick_home", "pick_post"]),
    payment: z.enum(["sender_pay", "receiver_pay"]),
    note: z.string().optional(),

    productName: z.string(),
    productQty: z.string(),      // string từ form
    productWeight: z.string(),   // string từ form

    shipCod: z.boolean(),
    amountCod: z.number(),       // string
    shipFee: z.number(),

    // sender
    senderName: z.string(),
    senderEmail: z.string(),
    senderNumberPhone: z.string(),
    senderCheckEmail: z.boolean(),
    senderAddress: z.string(),
    senderProvinceId: z.string(),
    senderWardId: z.string(),
    senderLngLat: z.string(),    // JSON: {longitude, latitude}
    senderSetDefault: z.boolean().optional(),
    isUserDefault: z.boolean().optional(),

    // receiver
    receiverName: z.string(),
    receiverEmail: z.string(),
    receiverNumberPhone: z.string(),
    receiverCheckEmail: z.boolean(),
    receiverAddress: z.string(),
    receiverProvinceId: z.string(),
    receiverWardId: z.string(),
    receiverLngLat: z.string(),  // JSON: {longitude, latitude}
})


export const createOrder = catchError(async (req, res) => {
    const {
        pick,
        payment,
        note, // ⚠ chưa lưu trong OrderModel – nếu cần lưu hãy thêm field vào schema

        productName,
        productQty,
        productWeight,

        shipCod,
        amountCod,
        shipFee,

        senderName,
        senderEmail,
        senderNumberPhone,
        senderCheckEmail,
        senderAddress,
        senderProvinceId,
        senderWardId,
        senderLngLat,
        senderSetDefault,
        isUserDefault,

        receiverName,
        receiverEmail,
        receiverNumberPhone,
        receiverCheckEmail,
        receiverAddress,
        receiverProvinceId,
        receiverWardId,
        receiverLngLat,
    } = SchemaInputOrder.parse(req.body);


    const businessId = (req as any).user.id
    if (!businessId) {
        return res.status(401).json({
            message: "Thiếu thông tin business, vui lòng kiểm tra middleware auth",
        });
    }
    if (!senderCheckEmail) {
        return res.status(400).json({
            message: "Email người gửi chưa được xác thực"
        })
    }
    if (!receiverCheckEmail) {
        return res.status(400).json({
            message: "Email người nhận chưa được xác thực"
        })
    }

    // ─────────────────────────────────────
    // VALIDATE DỮ LIỆU CƠ BẢN
    // ─────────────────────────────────────
    if (
        !senderName ||
        !senderNumberPhone ||
        !senderAddress ||
        !senderProvinceId ||
        !senderWardId ||
        !senderLngLat ||
        !receiverName ||
        !receiverNumberPhone ||
        !receiverAddress ||
        !receiverProvinceId ||
        !receiverWardId ||
        !receiverLngLat ||
        !productName ||
        !productQty ||
        !productWeight
    ) {
        return res.status(400).json({
            success: false,
            message: "Thiếu dữ liệu bắt buộc để tạo đơn hàng",
        });
    }


    // parse toạ độ
    const parsedSenderLngLat = JSON.parse(senderLngLat);
    const parsedReceiverLngLat = JSON.parse(receiverLngLat);

    const senderCoordinates: [number, number] = [
        parsedSenderLngLat.longitude,
        parsedSenderLngLat.latitude,
    ];
    const receiverCoordinates: [number, number] = [
        parsedReceiverLngLat.longitude,
        parsedReceiverLngLat.latitude,
    ];



    // ─────────────────────────────────────
    // 2. XỬ LÝ USER NGƯỜI GỬI (SELLER)
    // ─────────────────────────────────────
    // 1. Lấy userDefault theo business + type seller
    const defaultSeller = await UserModel.findOne({
        business: businessId,
        type: "seller",
        default: true,
    });


    let seller;

    // CASE 1: Nếu seller đang dùng default (defaultSeller tồn tại)
    if (isUserDefault && !senderSetDefault) {
        seller = defaultSeller; // dùng lại user default
    }

    // CASE 2 Tick “Set Default” → tạo mới + reset seller khác
    else if (senderSetDefault) {
        seller = await UserModel.create({
            name: senderName,
            numberPhone: senderNumberPhone,
            email: senderEmail,
            address: senderAddress,
            type: "seller",
            business: businessId,
            default: true, // user mới là default
            provinceId: senderProvinceId,
            wardId: senderWardId,
            location: {
                type: "Point",
                coordinates: senderCoordinates,
            },
        });
        // Set tất cả seller khác thành default false
        await UserModel.updateMany(
            {
                business: businessId,
                type: "seller",
                _id: { $ne: seller._id },
            },
            { $set: { default: false } }
        );

    }
    // CASE 3 ------------------------------------------------------
    // Không dùng userDefault, và không tick SetDefault
    // → Tạo seller mới default = false
    else {
        seller = await UserModel.create({
            name: senderName,
            numberPhone: senderNumberPhone,
            email: senderEmail,
            address: senderAddress,
            type: "seller",
            business: businessId,
            default: false, // không phải default
            provinceId: senderProvinceId,
            wardId: senderWardId,
            location: {
                type: "Point",
                coordinates: senderCoordinates,
            },
        });
    }


    const customer = await UserModel.create({
        name: receiverName,
        numberPhone: receiverNumberPhone,
        email: receiverEmail,
        address: receiverAddress,
        type: "customer",
        // business: new mongoose.Types.ObjectId(businessId),
        provinceId: receiverProvinceId,
        wardId: receiverWardId,
        location: {
            type: "Point",
            coordinates: receiverCoordinates,
        },
    });

    if (!seller || !customer) {
        return res.status(400).json({
            message: "Không cập nhật được dữ liệu User"
        })
    }
    // ============================
    // 3. GÁN BƯU CỤC PICKUP & DELIVERY
    // ============================
    const pickupOffice = await getBestPostOffice(
        senderWardId,
        senderProvinceId
    );

    const deliveryOffice = await getBestPostOffice(
        receiverWardId,
        receiverProvinceId
    );

    if (!pickupOffice || !deliveryOffice) {
        return res.status(400).json({
            success: false,
            message: "Không tìm thấy bưu cục phù hợp. Kiểm tra cấu hình PostOffice.",
        });
    }

    // ============================
    // 4. Shipment & Tracking code
    // ============================

    const trackingCode =
        "DLV-" + Date.now().toString(36).toUpperCase() + "-" + seller.id.toString().slice(-4);

    const shipmentEvent = {
        eventType: "created",
        timestamp: new Date(),
        note: "",
    }

    const shipment = {
        pickupOfficeId: pickupOffice.id,
        deliveryOfficeId: deliveryOffice.id,
        currentType: "created",
        trackingCode,
        events: [shipmentEvent],
    };
    // ============================
    // 5. Tạo ORDER
    // ============================
    console.log(productWeight)
    const qtyNum = Number(productQty);
    const weigtotalWeight = Number(productWeight);

    const codAmount = shipCod ? Number(amountCod || 0) : 0;

    // 1. Tạo route trước
    const routePlan = await generateRoutePlan({
        pickupOfficeId: shipment.pickupOfficeId,
        deliveryOfficeId: shipment.deliveryOfficeId
    });

    const newOrder = new OrderModel({
        sellerId: seller.id,
        customerId: customer.id,
        products: [
            {
                sku: "",
                name: productName,
                qty: qtyNum,
            },
        ],
        cod: shipCod,
        totalAmount: codAmount,
        shipFee,
        totalWeight: weigtotalWeight,
        pick,
        payment,
        note,
        shipment,
        routePlan,
        api_source: {
            clientId: "portal_web",
            orderRef: "",
            createdBy: "api",
        },
    });

    await newOrder.save()
    const emailPayload = {
        trackingCode,
        customerName: customer.name,
        customerPhone: customer.numberPhone,
        customerAddress: customer.address,
        createdAt: newOrder.createdAt
    };

    sendOrderSuccessEmail(customer.email, emailPayload).catch(err => console.error("Email failed: ", err));
    return res.status(200).json({
        message: "Tạo đơn hàng thành công",
        order: {
            trackingCode,
            createdAt: newOrder.createdAt,
        },
        customer: {
            name: customer.name,
            phone: customer.numberPhone,
            address: customer.address,
        }
    });
})

export const bulkCancelOrders = catchError(async (req, res) => {
    const businessId = (req as any).user.id;
    const { orderIds } = req.body as { orderIds: string[] };

    if (!businessId) {
        return res.status(401).json({
            message: "Thiếu thông tin business",
        });
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
            message: "orderIds phải là một mảng",
        });
    }

    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    console.log(ids)
    // Lấy tất cả seller thuộc business
    const sellerIds = await UserModel.find({
        business: businessId,
        type: "seller",
    }).distinct("_id");

    if (!sellerIds.length) {
        return res.status(400).json({
            message: "Không tìm thấy seller thuộc business",
        });
    }

    // Lấy danh sách order liên quan
    const orders = await OrderModel.find({
        _id: { $in: ids },
        sellerId: { $in: sellerIds },
    })
        .select("_id shipment status")
        .lean();

    if (!orders.length) {
        return res.status(404).json({
            message: "Không tìm thấy đơn hàng nào phù hợp",
        });
    }

    const orderCanceled = orders
        .filter((o) => o.status === "pending")

    const cancellableIds = orderCanceled.map((o) => o._id);

    console.log(cancellableIds)
    const nonCancellable = orders.filter((o) => o.status !== "pending");

    const shipmentEvent = {
        eventType: "cancelled",
        timestamp: new Date(),
        note: "Người bán đã hủy đơn hàng",
    }
    if (cancellableIds.length) {
        await OrderModel.updateMany(
            { _id: { $in: cancellableIds } },
            {
                $set: {
                    status: "cancelled",
                    "shipment.currentType": "cancelled",
                },
                $push: {
                    "shipment.events": shipmentEvent
                }
            },
        );
    }

    return res.status(200).json({
        message: "Hủy đơn hàng thành công",
        result: {
            cancelled: cancellableIds,
            skipped: nonCancellable.map((o) => ({
                _id: o.id,
                status: o.status,
            })),
        },
    });
});


export const bulkPrintOrdersPdf = catchError(async (req, res) => {
    const businessId = (req as any).user.id;
    const { orderIds, size } = req.body as {
        orderIds: string[];
        size?: "A5" | "A6";
    };

    const pageSize = size || "A6";

    if (!businessId) {
        return res.status(401).json({ message: "Thiếu thông tin business" });
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
            message: "orderIds phải là một mảng ID",
        });
    }

    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));

    // Chỉ lấy order thuộc seller của business
    const sellerIds = await UserModel.find({
        business: businessId,
        type: "seller",
    }).distinct("_id");

    const orders = await OrderModel.find({
        _id: { $in: ids },
        sellerId: { $in: sellerIds },
    })
        .populate("sellerId")
        .populate("customerId")
        .populate("shipment.pickupOfficeId")
        .populate({
            path: "shipment.deliveryOfficeId",
            populate: {
                path: "wardId",
                select: "code name"
            }
        })
        .lean();

    if (!orders.length) {
        return res.status(404).json({
            message: "Không tìm thấy đơn hàng",
        });
    }

    const htmlPages: string[] = [];



    for (const order of orders) {
        const html = await buildValueHtml({
            trackingCode: order.shipment.trackingCode,
            sellerName: (order.sellerId as any).name,
            sellerAddress: (order.sellerId as any).address,

            customerName: (order.customerId as any).name,
            customerPhone: maskPhone((order.customerId as any).numberPhone),
            customerAddress: (order.customerId as any).address,

            shipCod: order.cod,
            wardCode: order.shipment.deliveryOfficeId?.wardId.code || "",
            postCode: order.shipment.deliveryOfficeId?.code || "",

            orderId: order._id.toString(),
            totalWeight: order.totalWeight || 1,
            createdAt: order.createdAt,

            products: order.products
        });

        htmlPages.push(html);
    }

    const buildPdf = buildLabelHtml(htmlPages.join(""))

    // Puppeteer sinh PDF

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(buildPdf, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: pageSize,
        printBackground: true,
    });

    await browser.close();

    // Merge tất cả PDF (puppeteer làm được)


    // --- Sau khi sinh PDF => Cập nhật printed = true ---
    await OrderModel.updateMany(
        { _id: { $in: ids } },
        { $set: { printed: true } }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="labels_${pageSize.toLowerCase()}.pdf"`
    );
    return res.send(pdfBuffer);
});

export const getOrdersByBusiness = catchError(async (req, res) => {
    const businessId = (req as any).user.id
    if (!businessId) {
        return res.status(401).json({
            message: "Thiếu thông tin business, vui lòng kiểm tra middleware auth",
        });
    }

    const page = Number(req.query.page) || 1;
    const status = req.query.status || ""
    const printed = req.query.printed || "all";
    const limit = 10;
    const skip = (page - 1) * limit;

    // Tìm tất cả seller thuộc business này
    const sellerIds = await UserModel
        .find({ business: businessId, type: "seller" })
        .distinct("_id");

    if (sellerIds.length === 0) {
        return res.status(200).json({
            orders: [],
            pagination: { page, totalPages: 1 }
        });
    }

    // Build filter
    const query: any = {
        sellerId: { $in: sellerIds },
    };
    if (status) {
        query.status = status;
    }

    if (printed === "printed") {
        query.printed = true;
    } else if (printed === "not_printed") {
        query.printed = false;
    }
    // Query orders
    const orders = await OrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    // Đếm tổng
    const totalOrders = await OrderModel.countDocuments(query);

    const pickupOfficeIds = orders.map(o => o?.shipment?.pickupOfficeId).filter(Boolean);
    const deliveryOfficeIds = orders.map(o => o?.shipment?.deliveryOfficeId).filter(Boolean);

    // Load bưu cục chỉ 1 lần
    const postOffices = await PostOfficeModel
        .find({ _id: { $in: [...pickupOfficeIds, ...deliveryOfficeIds] } })
        .lean();

    const mapOffice = new Map(postOffices.map(p => [p._id.toString(), p]));

    // Format cho FE
    const result = orders.map(o => {
        const pickup = o.shipment?.pickupOfficeId
            ? mapOffice.get(o.shipment.pickupOfficeId.toString())
            : null;

        const delivery = o.shipment?.deliveryOfficeId
            ? mapOffice.get(o.shipment.deliveryOfficeId.toString())
            : null;

        return {
            _id: o._id,
            orderCode: o._id.toString().slice(-8).toUpperCase(),
            trackingCode: o.shipment?.trackingCode || null,
            shipFee: o.shipFee || 0,
            status: o.status,
            printed: o?.printed || false,

            pickupOffice: pickup
                ? {
                    _id: pickup._id,
                    name: pickup.name,
                    code: pickup.code,
                    address: pickup.address,
                }
                : null,

            deliveryOffice: delivery
                ? {
                    _id: delivery._id,
                    name: delivery.name,
                    code: delivery.code,
                    address: delivery.address,
                }
                : null
        };
    });

    return res.status(200).json({
        orders: result,
        pagination: {
            page,
            totalPages: Math.ceil(totalOrders / limit),
            total: totalOrders
        }
    });
});


export const getOrderDetailByBusiness = catchError(async (req, res) => {
    const businessId = (req as any).user.id;

    if (!businessId) {
        return res.status(401).json({
            success: false,
            message: "Thiếu thông tin business. Kiểm tra middleware xác thực.",
        });
    }

    const { orderId } = req.params;

    if (!orderId) {
        return res.status(400).json({
            success: false,
            message: "Thiếu ID đơn hàng",
        });
    }

    // 1. Lấy tất cả seller thuộc business
    const sellerIds = await UserModel.find({
        business: businessId,
        type: "seller",
    }).distinct("_id");

    if (sellerIds.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Business này chưa có nhân viên gửi hàng (seller).",
        });
    }

    // 2. Tìm đơn hàng + bảo vệ quyền truy cập
    const order = await OrderModel.findOne({
        _id: orderId,
        sellerId: { $in: sellerIds },
    })
        .populate("sellerId")
        .populate("customerId")
        .populate("shipment.events.officeId")      // ✔ cần để có office.name + address
        .populate("shipment.pickupOfficeId")
        .populate("shipment.deliveryOfficeId")
        .lean();

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy đơn hàng hoặc bạn không có quyền xem.",
        });
    }

    // 3. Format chuẩn FE
    const formatted = {
        _id: order._id,
        orderCode: order._id.toString().slice(-8).toUpperCase(),

        status: order.status,
        shipFee: order.shipFee || 0,
        cod: order.cod,

        // số tiền COD: nếu không phải đơn COD thì = 0
        amountCod: order.cod ? (order.totalAmount || 0) : 0,

        createdAt: order.createdAt,

        seller: {
            _id: (order.sellerId as any)?._id,
            name: (order.sellerId as any)?.name,
            phone: (order.sellerId as any)?.numberPhone,
            email: (order.sellerId as any)?.email,
            address: (order.sellerId as any)?.address,
            location: (order.sellerId as any)?.location,
        },

        customer: {
            _id: (order.customerId as any)?._id,
            name: (order.customerId as any)?.name,
            phone: (order.customerId as any)?.numberPhone,
            email: (order.customerId as any)?.email,
            address: (order.customerId as any)?.address,
            location: (order.customerId as any)?.location,
        },

        shipment: {
            trackingCode: order.shipment?.trackingCode || null,
            currentType: order.shipment?.currentType || null,

            pickupOffice: order.shipment?.pickupOfficeId || null,
            deliveryOffice: order.shipment?.deliveryOfficeId || null,

            events: (order.shipment?.events || []).map((ev: any) => ({
                eventType: ev.eventType,          // ✔ lấy trực tiếp từ embed
                eventNote: ev.eventNote || null,  // ✔ nội dung mô tả event

                timestamp: ev.timestamp,

                office: ev.officeId?.name || null,
                officeAddress: ev.officeId?.address || null,
                officeLocation: ev.officeId?.location || null,

                proofImages: ev.proofImages || [],
            })),
        }
    };

    return res.status(200).json({ order: formatted });
});


export const getOrdersForPickupOffice = catchError(async (req, res) => {
    const { pickupOfficeId } = req.params; // từ token employee
    if (!pickupOfficeId) {
        return res.status(401).json({ message: "Missing pickup office info" });
    }

    const page = Number(req.query.page) || 1;
    const status = req.query.status || "";
    const pick = req.query.pick || "";
    const limit = 10;
    const skip = (page - 1) * limit;

    const filter: any = {
        "shipment.pickupOfficeId": pickupOfficeId,
    };

    if (status) {
        filter["shipment.currentType"] = status;
    }

    if (pick) {
        filter.pick = pick;
    }

    const orders = await OrderModel.find(filter)
        .populate("sellerId")
        .populate("customerId")
        // Route plan (from / to)
        .populate("routePlan.from")
        .populate("routePlan.to")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    console.log(orders)
    const total = await OrderModel.countDocuments(filter);

    // Map về dạng FE cần
    const result = orders.map(o => {


        return {
            _id: o._id,
            orderCode: o._id.toString().slice(-8).toUpperCase(),
            trackingCode: o.shipment?.trackingCode ?? null,
            status: o.status,
            sender: {
                name: (o.sellerId as any)?.name,
                phone: (o.sellerId as any)?.numberPhone,
            },

            receiver: {
                name: (o.customerId as any)?.name,
                phone: (o.customerId as any)?.numberPhone,
            },

            receiverAddress: (o.customerId as any)?.address,
            weight: o.totalWeight,
            shipFee: o.shipFee,
            routePlan: o.routePlan,
            printed: o.printed,
            currentType: o.shipment.currentType,
            events: o.shipment.events,
            pick: o.pick,

            createdAt: o.createdAt
        }
    })


    return res.status(200).json({
        orders: result,
        pagination: {
            page,
            totalPages: Math.ceil(total / limit),
            total,
        }
    });
});

export const getOrdersForDeliveryOffice = catchError(async (req, res) => {
    const { pickupOfficeId } = req.params; // từ token employee
    if (!pickupOfficeId) {
        return res.status(401).json({ message: "Missing pickup office info" });
    }

    const page = Number(req.query.page) || 1;
    const status = req.query.status || "";
    const pick = req.query.pick || "";
    const limit = 10;
    const skip = (page - 1) * limit;

    const filter: any = {
        "shipment.deliveryOfficeId": pickupOfficeId,
    };

    if (status) {
        filter["shipment.currentType"] = status;
    }

    if (pick) {
        filter.pick = pick;
    }

    const orders = await OrderModel.find(filter)
        .populate("sellerId")
        .populate("customerId")
        // Route plan (from / to)
        .populate("routePlan.from")
        .populate("routePlan.to")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    console.log(orders)
    const total = await OrderModel.countDocuments(filter);

    // Map về dạng FE cần
    const result = orders.map(o => {


        return {
            _id: o._id,
            orderCode: o._id.toString().slice(-8).toUpperCase(),
            trackingCode: o.shipment?.trackingCode ?? null,
            status: o.status,
            sender: {
                name: (o.sellerId as any)?.name,
                phone: (o.sellerId as any)?.numberPhone,
            },

            receiver: {
                name: (o.customerId as any)?.name,
                phone: (o.customerId as any)?.numberPhone,
            },

            receiverAddress: (o.customerId as any)?.address,
            weight: o.totalWeight,
            shipFee: o.shipFee,
            routePlan: o.routePlan,
            printed: o.printed,
            currentType: o.shipment.currentType,
            events: o.shipment.events,
            pick: o.pick,

            createdAt: o.createdAt
        }
    })


    return res.status(200).json({
        orders: result,
        pagination: {
            page,
            totalPages: Math.ceil(total / limit),
            total,
        }
    });
});


export const arrangeTransportPickup = catchError(async (req, res) => {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
            message: "Missing orderIds"
        });
    }

    // Lấy orders pending
    const orders = await OrderModel.find({
        _id: { $in: orderIds },
        status: "pending"
    }).lean();

    if (orders.length === 0) {
        return res.status(400).json({
            message: "Không có đơn hàng hợp lệ để sắp xếp"
        });
    }

    const arranged: any[] = [];
    const failed: any[] = [];

    for (const order of orders) {
        try {
            // =====================
            // 1) Tìm location Seller
            // =====================
            const seller = await UserModel.findById(order.sellerId).lean();
            if (!seller || !seller.location) {
                failed.push({ _id: order._id, reason: "Không tìm thấy vị trí người bán" });
                continue;
            }

            const [longitude, latitude] = seller.location.coordinates;

            const zone = await ShipperZone.findOne({
                geometry: {
                    $geoIntersects: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] }
                    }
                }
            }).lean();

            if (!zone) {
                failed.push({ _id: order._id, reason: "Không tìm thấy khu vực hoạt động" });
                continue;
            }

            // =====================
            // 2) Tìm shipper theo zone
            // =====================
            const shipper = await ShipperDetailModel.findOne({
                shipperZoneId: zone._id,
                vehicleType: "bike",
                status: true
            }).lean();

            if (!shipper) {
                failed.push({ _id: order._id, reason: "Không có shipper cho khu vực này" });
                continue;
            }

            // =====================
            // 3) Tạo task
            // =====================
            await ShipperTaskModel.create({
                shipperDetailId: shipper._id,
                shipperMeta: {
                    vehicleType: shipper.vehicleType,
                    zoneId: zone._id.toString()
                },
                orderId: order._id,
                type: "pickup",
                status: "pending",
                assignedAt: new Date()
            });

            // =====================
            // 4) Update order
            // =====================
            const updatedOrder = await OrderModel.findOneAndUpdate(
                { _id: order._id },
                {
                    $set: {
                        status: "in_transit",
                        "shipment.currentType": "waiting_pickup"
                    },
                    $push: {
                        "shipment.events": {
                            eventType: "waiting_pickup",
                            timestamp: new Date(),
                            shipperDetailId: shipper._id,
                            note: "Đã phân công shipper đến lấy hàng"
                        }
                    }
                },
                { new: true }
            )
                .select({
                    _id: 1,
                    status: 1,
                    "shipment.currentType": 1,
                    "shipment.trackingCode": 1,
                    "shipment.events": 1
                })
                .lean();

            arranged.push({
                _id: updatedOrder?._id,
                trackingCode: updatedOrder?.shipment.trackingCode,
                status: updatedOrder?.status,
                currentType: updatedOrder?.shipment.currentType,
                events: updatedOrder?.shipment.events,
                assigned: {
                    shipperDetailId: shipper._id,
                    vehicleType: shipper.vehicleType,
                    zoneId: zone._id.toString()
                }
            });

        } catch (err) {
            failed.push({ _id: order._id, reason: "Lỗi server" });
        }
    }

    return res.status(200).json({
        message: "Đã sắp xếp vận chuyển",
        arranged,
        failed
    });
});



export const scanShipment = catchError(async (req, res) => {
    const { trackingCode, eventType, officeId } = req.body;

    const order = await OrderModel.findOne({ "shipment.trackingCode": trackingCode })
        .populate("routePlan.from")
        .populate("routePlan.to")
        .populate("shipment.events.officeId");

    if (!order) {
        return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // VALIDATE OFFICE & ROUTE STEP
    const isValid = validateOfficeRoute(order, officeId, eventType);
    if (!isValid.ok) {
        return res.status(400).json({ success: false, message: isValid.error });
    }

    const office = await PostOfficeModel.findById(officeId).lean()

    // UPDATE shipment
    order.shipment.events.push({
        eventType,
        officeId,
        note: eventType === "arrival" ? `Đơn hàng đã đến bưu cục ${office?.name}` : `Đơn hàng đã rời bưu cục ${office?.name}`,
        timestamp: new Date(),
    });

    order.shipment.currentType = eventType;

    if (eventType === "arrival" || eventType === "departure") {
        order.status = "in_transit";
    }

    // if (eventType === "delivered") order.status = "delivered";

    await order.save();

    return res.json({
        message: "Cập nhật trạng thái thành công",
        order: order,
    });
});
