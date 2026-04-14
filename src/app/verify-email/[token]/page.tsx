import type { Metadata } from "next";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: 'Verify Email',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
