import { z } from "zod";

const LocationSchema = z.object({
  lng: z.number(), // kinh độ
  lat: z.number(), // vĩ độ
});

const SellerSchema = z.object({
  name: z.string().min(1, "Thiếu tên người bán"),
  address: z.string().min(1, "Thiếu địa chỉ người bán"),
  phone: z.string().min(1, "Thiếu số điện thoại người bán"),
  location: LocationSchema,
});

const CustomerSchema = z.object({
  name: z.string().min(1, "Thiếu tên người nhận"),
  address: z.string().min(1, "Thiếu địa chỉ người nhận"),
  phone: z.string().min(1, "Thiếu số điện thoại người nhận"),
  location: LocationSchema,
});

const ProductSchema = z.object({
  sku: z.string().min(1, "Thiếu SKU sản phẩm"),
  name: z.string().min(1, "Thiếu tên sản phẩm"),
  quantity: z.number().int().positive("Số lượng phải > 0"),
});

export const SchemaInputOrder = z.object({
  seller: SellerSchema,
  customer: CustomerSchema,
  orderRef: z.string().min(1, "Thiếu mã tham chiếu đơn hàng (orderRef)"),
  products: z.array(ProductSchema).nonempty("Danh sách sản phẩm không được rỗng"),
  cod: z.boolean(),                 // true = thu hộ, false = đã thanh toán online
  totalWeight: z.number().nonnegative("Tổng khối lượng phải >= 0"),
  shipFee: z.number().nonnegative("Phí ship phải >= 0"),
  totalAmount: z.number().nonnegative("Tổng tiền phải >= 0"),
});
