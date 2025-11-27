import type { IBusiness } from "@/models/business.js";
import type { IEmployee } from "@/models/employee.js";
import { sendMail } from "@/utils/nodemailer.js";
import crypto from "crypto";


export const createPasswordResetToken = async (account: IBusiness | IEmployee) => {
    // 1) Tạo token gốc gửi cho user
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2) Hash để lưu DB (tránh lộ token)
    const hashed = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    account.password_reset_token = hashed;
    account.password_reset_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await account.save();

    // return token gốc để đưa vào email
    return resetToken;
};


export const verifyHashToken = (token: string) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}


export const sendResetPasswordEmail = async (email: string, token: string, roleName: string) => {
    const pathFE = process.env.ORIGIN_PATH_FRONTEND || "http://localhost:3000"
    // Link bạn muốn user truy cập để reset mật khẩu
    const resetURL = `${pathFE}/${roleName}/reset-password?token=${token}`;
    try {
      await sendMail({
          from: `"Hệ thống giao hàng" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Yêu cầu đặt lại mật khẩu",
          html: `
        <div style="font-family:sans-serif; line-height:1.6;">
          <h2>Đặt lại mật khẩu</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
  
          <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
  
          <a href="${resetURL}" 
            style="
              display:inline-block; 
              margin-top:12px; 
              padding:10px 20px; 
              background:#007bff; 
              color:white; 
              text-decoration:none; 
              border-radius:6px;
            ">
            Đặt lại mật khẩu
          </a>
  
          <p style="margin-top:20px;">
            Nếu không nhấn được nút, hãy copy đường dẫn bên dưới và mở trong trình duyệt:
          </p>
  
          <p style="word-break:break-all;">
            ${resetURL}
          </p>
  
          <p><strong>Token sẽ hết hạn sau 15 phút. Bạn chỉ có thể đặt lại mật khẩu trong thời gian đó</strong></p>
  
          <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
        </div>
      `
      });
      return true
    } catch (error) {
      console.log(error)
      return false
    }

};
