"use client";

import { useState } from "react";
import { X, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UsernameBannerProps {
  onDismiss: () => void;
}

export function UsernameBanner({ onDismiss }: UsernameBannerProps) {
  const router = useRouter();
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      // Mark the banner as shown
      await fetch("/api/user/username-banner-dismiss", {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to dismiss banner:", error);
    }
    onDismiss();
  };

  const handleSetUsername = () => {
    router.push("/settings#username");
    handleDismiss();
  };

  return (
    <div
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800 transition-all duration-300 ${
        isDismissing ? "opacity-0 transform -translate-y-full" : "opacity-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Welcome to Corpus!</span> Personalize your profile by setting a unique username that others can use to find you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              size="sm"
              variant="default"
              onClick={handleSetUsername}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="h-4 w-4 mr-1" />
              Set Username
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
