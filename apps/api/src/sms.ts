import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { config } from "./config";

type SmsProvider = "console" | "sns" | "disabled";

type SmsDeliveryResult = {
  provider: SmsProvider;
  previewCode: string;
};

function previewOtpCode(code: string): string {
  return config.nodeEnv === "production" ? "" : code;
}

async function sendViaSns(phone: string, code: string) {
  const region = config.sns.region;
  if (!region) {
    throw new Error("SNS SMS provider is missing configuration");
  }

  const client = new SNSClient({ region });
  const attributes: Record<string, string> = {
    "AWS.SNS.SMS.SMSType": config.sns.smsType
  };

  if (config.sns.senderId) {
    attributes["AWS.SNS.SMS.SenderID"] = config.sns.senderId;
  }

  await client.send(
    new PublishCommand({
      PhoneNumber: phone,
      Message: `Your LwayLway verification code is ${code}. It expires in 5 minutes.`,
      MessageAttributes: Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => [
          key,
          {
            DataType: "String",
            StringValue: value
          }
        ])
      )
    })
  );
}

export async function sendVerificationCode(phone: string, code: string): Promise<SmsDeliveryResult> {
  const provider: SmsProvider = config.smsProvider;

  if (provider === "disabled") {
    throw new Error("SMS delivery is not configured");
  }

  if (provider === "console") {
    console.log(`[sms] LwayLway OTP for ${phone}: ${code}`);
    return {
      provider,
      previewCode: previewOtpCode(code)
    };
  }

  await sendViaSns(phone, code);
  return {
    provider,
    previewCode: previewOtpCode(code)
  };
}

