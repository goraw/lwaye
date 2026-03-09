import { config } from "./config";

type PushProvider = "console" | "expo";

type PushPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function sendExpoPush(payloads: PushPayload[]) {
  const messages = payloads
    .filter((payload) => payload.token.startsWith("ExpoPushToken["))
    .map((payload) => ({
      to: payload.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default"
    }));

  if (messages.length === 0) {
    return;
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(messages)
  });

  if (!response.ok) {
    throw new Error(`Expo push delivery failed: ${response.status}`);
  }
}

export async function sendPushNotification(payloads: PushPayload[]) {
  if (payloads.length === 0) {
    return;
  }

  if ((config.pushProvider as PushProvider) === "expo") {
    await sendExpoPush(payloads);
    return;
  }

  for (const payload of payloads) {
    console.log(`[push] ${payload.token} :: ${payload.title} :: ${payload.body}`);
  }
}
