import { Buffer } from "node:buffer";
import { config } from "./config";

type SmsProvider = "console" | "twilio" | "disabled";

type SmsDeliveryResult = {
  provider: SmsProvider;
  previewCode: string;
};

function previewOtpCode(code: string): string {
  return config.nodeEnv === "production" ? "" : code;
}

async function sendViaTwilio(phone: string, code: string) {
  const accountSid = config.twilio.accountSid;
  const authToken = config.twilio.authToken;
  const fromPhone = config.twilio.fromPhone;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio SMS provider is missing configuration");
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromPhone,
    Body: `Your Lwaye verification code is ${code}. It expires in 5 minutes.`
  });

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Twilio SMS delivery failed: ${response.status} ${message}`);
  }
}

export async function sendVerificationCode(phone: string, code: string): Promise<SmsDeliveryResult> {
  const provider: SmsProvider = config.smsProvider;

  if (provider === "disabled") {
    throw new Error("SMS delivery is not configured");
  }

  if (provider === "console") {
    console.log(`[sms] Lwaye OTP for ${phone}: ${code}`);
    return {
      provider,
      previewCode: previewOtpCode(code)
    };
  }

  await sendViaTwilio(phone, code);
  return {
    provider,
    previewCode: previewOtpCode(code)
  };
}
