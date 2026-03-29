import { NextResponse } from "next/server";
import webpush from "web-push";

// Initialize VAPID details only if environment variables are present
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:your-email@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn(
    "VAPID keys are missing. Push notifications will not work. Please add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your environment variables."
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, title, message } = body;

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription provided" },
        { status: 400 }
      );
    }

    if (
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "Push notification service is not configured" },
        { status: 500 }
      );
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title || "Omduaikan",
        body: message || "ได้เวลาทานยาแล้ว!",
        url: "/",
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
