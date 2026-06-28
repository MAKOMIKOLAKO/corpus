"use client";

interface Entry {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  contentType: string;
}

interface User {
  id: string;
  name?: string;
  username?: string;
}

interface ReferenceRequestButtonProps {
  entry: Entry;
  owner: User;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export default function ReferenceRequestButton({
  entry,
  owner,
  variant = "outline",
  size = "sm",
  className = ""
}: ReferenceRequestButtonProps) {
  return null;
}
