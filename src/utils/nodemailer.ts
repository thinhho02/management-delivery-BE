import nodemailer from "nodemailer";


export const sendMail = async (option: any) => {
    
    const mailer = nodemailer.createTransport({
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT!),
        secure: process.env.SMTP_SECURE === "true", // false nếu dùng port 587
        auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
        },
    });
    await mailer.sendMail(option)
}