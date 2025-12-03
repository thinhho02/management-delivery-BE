import { sendMail } from "@/utils/nodemailer.js";


export const generateStrongPassword = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const all = letters + digits;

    // ít nhất 1 chữ
    const letter = letters[Math.floor(Math.random() * letters.length)]!;
    // ít nhất 1 số
    const digit = digits[Math.floor(Math.random() * digits.length)]!;

    let rest = '';
    for (let i = 0; i < 4; i++) {
        rest += all[Math.floor(Math.random() * all.length)];
    }

    // trộn ngẫu nhiên
    const password = (letter + digit + rest)
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');

    return password;
}

type TSendNewAccountToMail = (
    email: string,
    employeeName: string,
    officeName: string,
    officeAddress: string,
    password: string
) => Promise<boolean>

export const sendNewAccountToMail: TSendNewAccountToMail = async (email, employeeName, officeName, officeAddress, password) => {
    const pathFE = process.env.ORIGIN_PATH_FRONTEND || "http://localhost:3000"

    const loginURL = `${pathFE}/internal/login`;

    try {
        await sendMail({
            from: `"Hệ thống giao hàng" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Tài khoản nhân viên đã được tạo thành công",

            html: `
        <div style="font-family:sans-serif; line-height:1.6; padding: 10px;">
          <h2 style="color:#0d6efd;">Chào ${employeeName},</h2>
    
          <p>Chúc mừng! Tài khoản nhân viên của bạn đã được tạo thành công trên hệ thống giao hàng.</p>
    
          <p>
            Từ hôm nay, bạn sẽ làm việc tại:
          </p>
    
          <div style="background:#f8f9fa; padding:12px; border-radius:6px; margin-top:6px;">
            <p style="margin:4px 0;"><strong>Bưu cục:</strong> ${officeName}</p>
            <p style="margin:4px 0;"><strong>Địa chỉ:</strong> ${officeAddress}</p>
          </div>
    
          <p style="margin-top:18px;">
            Dưới đây là mật khẩu đăng nhập của bạn:
          </p>
    
          <div style="background:#e7f1ff; padding:12px; border-radius:6px; margin-top:6px;">
            <p style="margin:0; font-size:16px;">
              <strong>Mật khẩu:</strong> 
              <span style="color:#0d6efd; font-weight:bold;">${password}</span>
            </p>
          </div>
    
          <p style="margin-top:20px;">
            Nhấn vào nút bên dưới để đăng nhập vào hệ thống:
          </p>
    
          <a href="${loginURL}"
            style="
              display:inline-block;
              margin-top:12px;
              padding:10px 20px;
              background:#198754;
              color:white;
              text-decoration:none;
              border-radius:6px;
              font-size:15px;
            ">
            Đăng nhập hệ thống
          </a>
    
          <p style="margin-top:24px;">
            <strong>Lưu ý:</strong> Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật tài khoản của bạn.
          </p>
    
          <p style="margin-top:20px;">Nếu bạn không yêu cầu tạo tài khoản, vui lòng liên hệ quản trị hệ thống để được hỗ trợ.</p>
    
          <p style="margin-top:12px;">Trân trọng,<br/>Hệ thống giao hàng</p>
        </div>
      `
        });

        return true
    } catch (error) {
        console.log(error)
        return false
    }
}