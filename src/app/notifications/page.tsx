import type { Metadata } from "next";
import NotificationsPageClient from "./NotificationsPageClient";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View your notifications and updates",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServerNotificationsPage() {
  return <NotificationsPageClient />;
}
