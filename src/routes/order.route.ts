import {
    arrangeTransportPickup,
    bulkCancelOrders,
    bulkPrintOrdersPdf,
    createOrder,
    getOrderByHubInbound,
    getOrderByHubOutbound,
    getOrderBySortingInbound,
    getOrderBySortingOutbound,
    getOrderDetailByBusiness,
    getOrdersByBusiness,
    getOrdersForDeliveryOffice,
    getOrdersForPickupOffice,
    scanDeliveredByShipper,
    scanPickupByShipper,
    scanShipmentOffice
} from "@/controllers/order.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeOrder = Router()

// /order

routeOrder.post("/create", verifyAccessToken, createOrder)
routeOrder.get("/business", verifyAccessToken, getOrdersByBusiness)
routeOrder.get("/business/:orderId", verifyAccessToken, getOrderDetailByBusiness)
// hủy đơn hàng
routeOrder.post("/bulk-cancel", verifyAccessToken, bulkCancelOrders)

// in đơn
routeOrder.post("/print-bulk", verifyAccessToken, bulkPrintOrdersPdf)




routeOrder.get("/delivery_office/:officeId/inbound", verifyAccessToken, getOrdersForPickupOffice)
routeOrder.get("/delivery_office/:officeId/outbound", verifyAccessToken, getOrdersForDeliveryOffice)

routeOrder.get("/distribution_hub/:officeId/inbound", verifyAccessToken, getOrderByHubInbound)
routeOrder.get("/distribution_hub/:officeId/outbound", verifyAccessToken, getOrderByHubOutbound)

routeOrder.get("/sorting_center/:officeId/inbound", verifyAccessToken, getOrderBySortingInbound)
routeOrder.get("/sorting_center/:officeId/outbound", verifyAccessToken, getOrderBySortingOutbound)
// routeOrder.get("/delivery-office/:pickupOfficeId", verifyAccessToken, getOrdersForDeliveryOffice)



routeOrder.put("/pickup-office/arrange-transport", verifyAccessToken, arrangeTransportPickup)

routeOrder.put("/office/qr-scan", verifyAccessToken, scanShipmentOffice)


routeOrder.put("/shipper/qr-scan-pickup", verifyAccessToken, scanPickupByShipper)
routeOrder.put("/shipper/qr-scan-delivered", verifyAccessToken, scanDeliveredByShipper)


export default routeOrder