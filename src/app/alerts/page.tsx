import type { Metadata } from "next";
import AlertsPageClient from "./AlertsPageClient";

export const metadata: Metadata = {
  title: "Smart Alerts",
  description: "Manage your smart paper alerts and research interests",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServerAlertsPage() {
  return <AlertsPageClient />;
}
