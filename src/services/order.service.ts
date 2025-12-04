import type { IOrder, ShipmentEventType } from "@/models/order.js";
import PostOfficeModel from "@/models/postOffice.js";
import { AppThrowError } from "@/utils/AppThrowError.js";
import { sendMail } from "@/utils/nodemailer.js";
import dayjs from "dayjs";
import QRCode from "qrcode";




export const getBestPostOffice = async (
  wardId: string,
  provinceId: string,
  regionId?: string
) => {
  // 1. delivery_office theo wardId
  let office = await PostOfficeModel.findOne({
    wardId,
    type: "delivery_office",
  });
  if (office) return office;

  // 2. delivery_office theo province
  office = await PostOfficeModel.findOne({
    provinceId,
    type: "delivery_office",
  });
  if (office) return office;

  // 3. distribution_hub theo province
  office = await PostOfficeModel.findOne({
    provinceId,
    type: "distribution_hub",
  });
  if (office) return office;

  // 4. sorting_center theo region
  if (regionId) {
    office = await PostOfficeModel.findOne({
      regionId,
      type: "sorting_center",
    });
    if (office) return office;
  }

  return null;
}


export const sendOrderSuccessEmail = async (email: string, data: any) => {
  const { trackingCode, customerName, customerPhone, customerAddress, createdAt } = data;

  const dateStr = dayjs(createdAt).format("DD/MM/YYYY HH:mm");

  const html = `
  <div style="background:#f5f6fa;padding:30px;font-family:'Segoe UI',sans-serif">
  
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08)">
      
      <!-- Header -->
      <div style="background:#ff4d4f;padding:20px 30px;color:white">
        <h2 style="margin:0;font-weight:600;font-size:24px">
          🎉 Đơn hàng đã được tạo thành công!
        </h2>
      </div>

      <!-- Body -->
      <div style="padding:30px;color:#333">

        <p style="font-size:16px;margin-bottom:20px">
          Cảm ơn bạn đã sử dụng dịch vụ vận chuyển của chúng tôi.  
          <br/>Đơn hàng của bạn đã được hệ thống ghi nhận.
        </p>

        <h3 style="margin:0 0 10px;font-size:18px;color:#ff4d4f">📦 Thông tin đơn hàng</h3>
        <table style="width:100%;font-size:15px;margin-bottom:25px">
          <tr>
            <td style="padding:8px 0;font-weight:600;width:140px">Mã đơn hàng:</td>
            <td>${trackingCode}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600">Ngày tạo:</td>
            <td>${dateStr}</td>
          </tr>
        </table>

        <h3 style="margin:0 0 10px;font-size:18px;color:#ff4d4f">👤 Người nhận</h3>
        <table style="width:100%;font-size:15px">
          <tr>
            <td style="padding:8px 0;font-weight:600;width:140px">Tên:</td>
            <td>${customerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600">Số điện thoại:</td>
            <td>${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:600">Địa chỉ:</td>
            <td>${customerAddress}</td>
          </tr>
        </table>

        <div style="margin-top:30px;text-align:center">
          <a href="#" 
            style="
              display:inline-block;
              padding:12px 22px;
              background:#ff4d4f;
              color:white;
              border-radius:6px;
              text-decoration:none;
              font-weight:600;
            ">
            Theo dõi đơn hàng
          </a>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:#fafafa;padding:15px 30px;text-align:center;font-size:13px;color:#777">
        Đây là email tự động, vui lòng không trả lời lại.<br/>
        © ${new Date().getFullYear()} Hệ thống giao hàng. All rights reserved.
      </div>
    </div>

  </div>
  `;

  try {
    await sendMail({
      from: `"Hệ thống giao hàng" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Đơn hàng đã được tạo thành công",
      html,
    });

    return true;
  } catch (err) {
    console.log("Email gửi lỗi:", err);
    return false;
  }
};


interface IProduct {
  name: string;
  sku: string;
  qty: number
}

interface LabelData {
  trackingCode: string;
  sellerName: string;
  sellerAddress: string;

  customerName: string;
  customerPhone: string;
  customerAddress: string;

  shipCod: boolean;
  wardCode: string;
  postCode: string;

  orderId: string;
  totalWeight: number;
  createdAt: Date;

  products: IProduct[]
}

export function maskPhone(phone: string) {
  if (!phone) return "";
  if (phone.length <= 4) return phone;

  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);

  const stars = "*".repeat(phone.length - 4);

  return `${first2}${stars}${last2}`;
}


export const buildValueHtml = async (data: LabelData) => {
  const qr = await QRCode.toDataURL(data.trackingCode, {
    width: 90,
    margin: 0,
  });

  const codText = data.shipCod ? "COD" : "";
  const productRowsHtml = data.products
    .map((p) => {
      return `
      <tr>
        <td>${p.name}</td>
        <td>${p.sku}</td>
        <td>${p.qty}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="page-container">
      <div class="invoice-wrapper">
        <div class="shipping-label">
          <div class="flex-1">
            <div class="label-header">
              <div class="header-left">
                <div class="logo-tiktok">
                  <span>T&K express</span>
                </div>
              </div>

              <div class="header-right">
                <div class="service-type">${data.trackingCode}</div>
              </div>
            </div>

            <div class="main-content">
              <div class="left-section">
                <div class="info-block">
                  <label for="name-sender"
                    class="label-small">Người gửi</label>
                  <span id="name-sender" class="shop-name">${data.sellerName}</span>
                  <div class="address-text">
                    ${data.sellerAddress}
                  </div>
                </div>

                <div class="info-block-recipient">
                  <div class="name-rece">
                    <label for="name-customer"
                      class="label-small">Người nhận</label>
                    <span id="name-customer"
                      class="recipient-name">${data.customerName}</span>
                  </div>
                  <div class="recipient-phone">${data.customerPhone}</div>
                </div>

                <div class="destination">

                  <div class="address-text">
                    ${data.customerAddress}
                  </div>
                </div>

                <div class="cod-section">
                  <div class="cod-badge">${codText}</div>
                </div>

              </div>

              <div class="right-section">
                <div class="routing-number">${data.wardCode}</div>
                <div class="package-code">${data.postCode}</div>
                <div class="wrap-qrcode">
                  <div class="qr-code">
                    <div class="qr-grid">
                      <div class="qr-row">
                        <img src='${qr}' />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <div class="info-order">
                <div class="order-details">
                  <div class="order-details-left">
                    <div class="detail-row">
                      <span class="detail-label">Order
                        ID:</span>
                      <span
                        class="detail-value order-code">${data.orderId}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Trọng
                        lượng:</span>
                      <span class="detail-value">${data.totalWeight}
                        KG</span>
                    </div>
                  </div>
                  <div class="time-order">
                    <div class="detail-row time">
                      <span class="detail-label">Thời gian đặt
                        hàng:</span>
                      <span class="detail-value">${dayjs(data.createdAt).format("DD/MM/YYYY HH:mm")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="table-area">
              <table class="product-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                 ${productRowsHtml}

                </tbody>
              </table>
            </div>
          </div>

          <div class="bottom-section">

            <div class="footer">
              <div class="footer-logo">
                <span>T&k express</span>
              </div>
              <div class="footer-order">Order ID:
                ${data.orderId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `
}

// Render 1 tem label (layout kiểu J&T trong hình)
export const buildLabelHtml = (body: string) => {
  return `
  <html>
<head>
<meta charset="utf-8" />
<style>
/* ==== A6 PAGE SIZE ==== */
.page-container {
  width: 400px;      /* A6 chuẩn */
  height: 540px;     /* A6 chuẩn */
  background: #fff;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.invoice-wrapper {
  height: 100%;
  width: 100%;
}

/* Shipping Label */
.shipping-label {
height: 100%;
padding: 0px 12px 0px 10px;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 10px;
      display: flex;
    flex-direction: column;
    justify-content: space-between;
}

/* Header */
.label-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
}

.logo-tiktok {
  font-size: 14px;
  font-weight: bold;
}

.service-type {
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}

/* Main Content */
.main-content {
  display: flex;
    border: 2px solid #000;
    flex-wrap: wrap;
    margin-bottom: 20px;

}

.left-section {
  flex: 2;
  padding-top: 10px;
  border-right: 2px solid black;
  display: flex;
  flex-direction: column;

  justify-content: space-between;
}

.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Info Block */
.info-block {
  padding-bottom: 4px;
  padding-left: 4px;
  border-bottom: 1px solid #000;
}

.label-small {
  font-size: 9px;
  font-weight: bold;
}

.shop-name {
  padding-left: 26px;
  font-size: 10px;
  font-weight: bold;
}

.address-text {
  padding-left: 4px;
  font-size: 9px;
  font-weight: bold;
  margin-top: 6px;
  line-height: 1.2;
}

/* Recipient */
.info-block-recipient {
  display: flex;
  justify-content: space-between;
  padding-top: 6px;
  padding-bottom: 4px;
  padding-left: 4px;
  border: none
}

.name-rece{
  flex: 1;
}

.recipient-name {
  margin-left: 5px;
  font-size: 13px;
  font-weight: bold;
}

.recipient-phone {
  font-size: 10px;
  padding-right: 10px;
}

/* COD Section */
.cod-section {
  width: 100%;
  margin-top: 10px;
  background: black;
  color: white;
  padding: 6px 0;
}

.cod-badge {
  text-align: center;
  font-size: 18px;
  height: 20px;
  font-weight: bold;
  letter-spacing: 3px;
}

/* Right Section Fields */
.routing-number,
.package-code {
  width: 100%;
  font-size: 18px;
  font-weight: bold;
  padding: 6px 0;
  border-bottom: 1px solid #000;
  text-align: center;
}

/* QR */
.wrap-qrcode {
  width: 100%;
  padding: 9px 0;
  border-bottom: 1px solid black;
  display: flex;
  justify-content: center;
}

.qr-code {
  width: 90px;
  height: 90px;
}

.separator-line { border-top: 2px dashed #999; margin: 0; }

/* Order Details */
.info-order{
  width: 100%;
}

.order-details {
  width: 100%;
  display: flex;
}

.order-details-left {
  flex: 1;
  padding: 6px;
  border-right: 1px solid #000;
}

.detail-row {
  display: flex;
  font-size: 9px;
  margin-bottom: 5px;
}

.time{
  gap: 2px;
}

.detail-label {
  font-weight: bold;
  min-width: 60px;
}

.order-code{
  font-size: 10px;
  font-weight: bold;
}

.time-order {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
}

/* Product Table */
.table-area{
    padding-top: 20px;
    border-top: 1px dashed black;
}


.product-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.product-table th {
  background: #f5f5f5;
  padding: 6px;
  border: 1px solid #ddd;
}

.product-table td {
  padding: 6px;
  border: 1px solid #ddd;
}

/* Footer */
.footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 10px;
    border-top: 1px solid black;
    border-bottom: 1px solid black;
}

.footer-logo {
  font-size: 12px;
  font-weight: bold;
}
.flex-1{
  flex: 1;
}
</style>
</head>
<body>
  ${body}

</body>
</html>
  `;
};



export async function generateRoutePlan({
  pickupOfficeId,
  deliveryOfficeId
}: {
  pickupOfficeId: string;
  deliveryOfficeId: string;
}) {

  // Lấy PostOffice
  const pickup = await PostOfficeModel.findById(pickupOfficeId);
  const delivery = await PostOfficeModel.findById(deliveryOfficeId);
  if (!pickup || !delivery) throw new Error("Invalid PostOffice IDs");

  // Hub tỉnh
  const fromHub = await PostOfficeModel.findOne({
    type: "distribution_hub",
    provinceId: pickup.provinceId
  });

  const toHub = await PostOfficeModel.findOne({
    type: "distribution_hub",
    provinceId: delivery.provinceId
  });

  // Sorting Center quốc gia
  const sortingCenter = await PostOfficeModel.findOne({
    type: "sorting_center"
  });

  if (!fromHub || !toHub || !sortingCenter) {
    throw new AppThrowError("Không tìm thấy bưu cục");
  }

  let steps = [];
  let order = 1;

  // ------------------------------------------------------
  // STEP 1: Pickup Office → Hub tỉnh nguồn
  // ------------------------------------------------------
  steps.push({
    from: pickup.id,
    to: fromHub.id,
    type: "pickup",
    order: order++
  });

  // ------------------------------------------------------
  // Nếu cùng tỉnh → đi thẳng đến Delivery Office
  // ------------------------------------------------------
  if (pickup.provinceId === delivery.provinceId) {
    steps.push({
      from: fromHub.id,
      to: delivery.id,
      type: "hub",
      order: order++
    });

    return steps;
  }

  // ------------------------------------------------------
  // Nếu khác tỉnh → đi qua Sorting + Hub đích + Delivery
  // ------------------------------------------------------
  // Hub nguồn → Sorting
  steps.push({
    from: fromHub.id,
    to: sortingCenter.id,
    type: "hub",
    order: order++
  });

  // Sorting → Hub đích
  steps.push({
    from: sortingCenter.id,
    to: toHub.id,
    type: "sorting",
    order: order++
  });

  // Hub đích → Delivery
  steps.push({
    from: toHub.id,
    to: delivery.id,
    type: "delivery",
    order: order++
  });

  return steps;
}


// export function validateOfficeRoute(order: IOrder, officeId: string, eventType: string) {
//   const routePlan = order.routePlan;

//   if (!routePlan || !routePlan.length) {
//     return { ok: false, error: "Đơn hàng không có routePlan" };
//   }

//   // Step khớp với sự kiện actual
//   const lastEvent = order.shipment.events[order.shipment.events.length - 1];
//   const lastOffice = lastEvent?.officeId?.id;

//   // Tìm step hiện tại dựa vào event trước đó
//   let currentStepIndex = routePlan.findIndex(
//     (step) =>
//       step.from?._id?.toString() === lastOffice ||
//       step.to?._id?.toString() === lastOffice
//   );

//   if (currentStepIndex === -1) currentStepIndex = 0;

//   const currentStep = routePlan[currentStepIndex];

//   // ---- RULES ----
//   if (eventType === "arrival") {
//     // arrival phải đến đúng "to"
//     if (currentStep?.to._id.toString() !== officeId) {
//       return { ok: false, error: "Không đúng bưu cục nhận hàng theo tuyến" };
//     }
//   }

//   if (eventType === "departure") {
//     // departure phải từ đúng "to" của step hiện tại
//     if (currentStep?.to._id.toString() !== officeId) {
//       return { ok: false, error: "Không đúng bưu cục xuất hàng theo tuyến" };
//     }
//   }

//   return { ok: true };
// }

export function hasOfficeScanned(
  order: IOrder,
  whoScan: string,
  eventType: ShipmentEventType
) {
  return order.shipment.events.some((ev: any) => {

    // Office-related events
    const isOfficeEvent = ["arrival", "departure", "returned"].includes(eventType);
    if (isOfficeEvent) {
      return ev.eventType === eventType && ev.officeId?._id.toString() === whoScan;
    }

    // Shipper-related events
    const isShipperEvent = ["pickup", "delivery_attempt", "delivered"].includes(eventType);
    if (isShipperEvent) {
      // delivery_attempt có thể nhiều lần => không chặn
      if (eventType === "delivery_attempt") return false;
      return ev.eventType === eventType && ev.shipperDetailId?.toString() === whoScan;
    }

    // System event — always block duplicates
    return ev.eventType === eventType;
  });
}

// export function validateOfficeRoute(order: IOrder, officeId: string, eventType: ShipmentEventType) {
//   const routePlan = order.routePlan;

//   if (!routePlan || !routePlan.length) {
//     return { ok: false, error: "Đơn hàng không có tuyến vận chuyển" };
//   }


//   // -------------------------------
//   // Tìm step nào chứa officeId
//   // -------------------------------
//   const stepIndex = routePlan.findIndex(
//     (step) =>
//       step.from?._id?.toString() === officeId ||
//       step.to?._id?.toString() === officeId
//   );

//   if (stepIndex === -1) {
//     return { ok: false, error: "Bưu cục không thuộc tuyến vận chuyển của đơn hàng" };
//   }

//   const step = routePlan[stepIndex];

//   // -------------------------------
//   // eventType của shipper có thể SKIP
//   // -------------------------------
//   const shipperSkipEvents: ShipmentEventType[] = [
//     "waiting_pickup",
//     "pickup"
//   ];

//   if (shipperSkipEvents.includes(eventType)) {
//     return { ok: true }; // shipper không bị validate tuyến
//   }

//   // -------------------------------
//   // Lấy lastEvent để xác định step hiện tại của tuyến
//   // -------------------------------
//   const lastEvent = order.shipment.events.at(-1);
//   const lastOffice = lastEvent?.officeId?._id.toString();

//   let currentStepIndex = 0;

//   if (lastOffice) {
//     const found = routePlan.findIndex(
//       s => s.to?._id?.toString() === lastOffice
//     );

//     if (found !== -1) currentStepIndex = found;
//   }

//   const currentStep = routePlan[currentStepIndex];

//   // -------------------------------
//   // Validate ARRIVAL
//   // -------------------------------
//   if (eventType === "arrival" && stepIndex === 0) {
//     return { ok: true };
//   }


//   if (eventType === "arrival") {
//     if (step && step.to._id.toString() !== officeId) {
//       return { ok: false, error: "Không đúng tuyến vận chuyển" };
//     }

//     if (stepIndex < currentStepIndex) {
//       return { ok: false, error: "Sai thứ tự tuyến" };
//     }

//     return { ok: true };
//   }

//   // -------------------------------
//   // Validate DEPARTURE (rời đúng bưu cục)
//   // -------------------------------
//   if (eventType === "departure") {
//     if (currentStep && currentStep.from._id.toString() !== officeId) {
//       return { ok: false, error: "Không đúng tuyến vận chuyển" };
//     }
//     return { ok: true };
//   }

//   // -------------------------------
//   // Các event khác luôn hợp lệ
//   // -------------------------------
//   return { ok: true };
// }

export function validateOfficeRoute(
  order: IOrder,
  officeId: string,
  eventType: ShipmentEventType
) {
  const routePlan = order.routePlan;
  const officeIdStr = officeId.toString();

  if (!routePlan || !routePlan.length) {
    return { ok: false, error: "Đơn hàng không có tuyến vận chuyển" };
  }

  // 0) Event không phải của bưu cục -> không check
  if (eventType !== "arrival" && eventType !== "departure") {
    return { ok: true };
  }

  // 1) Office phải nằm trong routePlan
  const belongsToRoute = routePlan.some(
    (step) =>
      step.from?._id?.toString() === officeIdStr ||
      step.to?._id?.toString() === officeIdStr
  );

  if (!belongsToRoute) {
    return { ok: false, error: "Bưu cục không thuộc tuyến vận chuyển của đơn hàng" };
  }

  const events = order.shipment?.events || [];

  // 2) Tính step đã hoàn thành cuối cùng = arrival tại step.to
  let lastCompletedStepIndex = -1;

  for (const ev of events) {
    if (ev.eventType !== "arrival" || !ev.officeId) continue;
    const evOfficeId = ev.officeId.toString();

    const idx = routePlan.findIndex(
      (step) => step.to?._id?.toString() === evOfficeId
    );
    if (idx > lastCompletedStepIndex) {
      lastCompletedStepIndex = idx;
    }
  }

  const firstStep = routePlan[0];
  const lastStepIndex = routePlan.length - 1;

  // =========================
  // ARRIVAL
  // =========================
  if (eventType === "arrival") {
    // 2.1) Chưa có step nào hoàn thành -> arrival đầu tiên
    if (lastCompletedStepIndex === -1) {
      // Arrival đầu tiên PHẢI ở pickupOffice (from của step 0)
      if (firstStep && firstStep.from?._id?.toString() !== officeIdStr) {
        return {
          ok: false,
          error: "Đơn hàng phải được nhập kho tại bưu cục nhận đầu tiên theo tuyến"
        };
      }
      return { ok: true };
    }

    // 2.2) Đã hoàn thành một số step -> arrival tiếp theo
    const nextStepIndex = lastCompletedStepIndex + 1;
    if (nextStepIndex > lastStepIndex) {
      return {
        ok: false,
        error: "Đơn hàng đã hoàn tất tuyến, không thể nhập kho thêm"
      };
    }

    const nextStep = routePlan[nextStepIndex];
    if (nextStep && nextStep.to?._id?.toString() !== officeIdStr) {
      return {
        ok: false,
        error: "Không đúng bưu cục nhận hàng tiếp theo theo tuyến"
      };
    }

    return { ok: true };
  }

  // =========================
  // DEPARTURE
  // =========================
  if (eventType === "departure") {
    // 3.1) Chưa có arrival step nào -> xuất từ pickupOffice
    if (lastCompletedStepIndex === -1) {
      if (firstStep && firstStep.from?._id?.toString() !== officeIdStr) {
        return {
          ok: false,
          error: "Không đúng bưu cục xuất kho đầu tiên theo tuyến"
        };
      }
      return { ok: true };
    }

    const nextStepIndex = lastCompletedStepIndex + 1;

    // 3.2) Nếu tất cả step đã hoàn thành (đã arrival bưu cục cuối)
    if (nextStepIndex > lastStepIndex) {
      // Cho phép xuất kho từ bưu cục cuối (giao cho shipper)
      const finalOfficeId = routePlan[lastStepIndex]?.to?._id?.toString();
      if (finalOfficeId !== officeIdStr) {
        return {
          ok: false,
          error: "Không đúng bưu cục xuất kho cuối tuyến"
        };
      }
      return { ok: true };
    }

    // 3.3) Đang ở giữa tuyến -> departure phải từ from của step kế tiếp
    const nextStep = routePlan[nextStepIndex];
    if (nextStep && nextStep.from?._id?.toString() !== officeIdStr) {
      return {
        ok: false,
        error: "Không đúng bưu cục xuất kho theo tuyến"
      };
    }

    return { ok: true };
  }

  return { ok: true };
}
