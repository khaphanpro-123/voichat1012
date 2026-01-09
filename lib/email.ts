import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("Missing RESEND_API_KEY - email sending disabled");
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendOTPEmail(email: string, otp: string, type: "register" | "reset-password" = "register") {
  const resend = getResend();
  
  if (!resend) {
    console.log(`[NO RESEND] Would send OTP ${otp} to ${email}`);
    return { id: "no-resend-configured" };
  }
  
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const appName = "EnglishPal";

  const subject = type === "register" 
    ? `[${appName}] Mã xác nhận đăng ký: ${otp}`
    : `[${appName}] Mã đặt lại mật khẩu: ${otp}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
        .otp-box { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .message { text-align: center; color: #666; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 14px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🇬🇧 ${appName}</div>
        </div>
        <h2 style="text-align: center;">${type === "register" ? "Xác nhận đăng ký tài khoản" : "Đặt lại mật khẩu"}</h2>
        <p class="message">Mã xác nhận của bạn là:</p>
        <div class="otp-box">${otp}</div>
        <p class="message">Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
        <div class="warning">
          ⚠️ Không chia sẻ mã này với bất kỳ ai. Nhân viên ${appName} sẽ không bao giờ hỏi mã OTP của bạn.
        </div>
        <div class="footer">
          <p>Email này được gửi tự động từ ${appName}.</p>
          <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error("Send email error:", error);
    throw new Error(error.message);
  }

  return data;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
