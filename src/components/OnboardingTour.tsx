"use client";

import { useState, useCallback, useEffect } from "react";
import { Joyride, Step, STATUS } from "react-joyride";
import { useSession } from "next-auth/react";
import { analytics } from "@/lib/analytics";

const ONBOARDING_STEPS: Step[] = [
  {
    target: "body",
    content: "Welcome to Corpus! Let's take a quick tour to help you get started.",
    placement: "center",
    title: "Welcome to Corpus! 👋",
  },
  {
    target: '[data-onboarding="add-entry"]',
    content: "This is where you can add new entries to your library. You can save them manually, or via DOI, URL, or ISBN.",
    title: "Add Entries 📚",
    placement: "bottom",
  },
  {
    target: '[data-onboarding="library-view"]',
    content: "Your library displays all your saved entries. You can filter, search, and organize them here.",
    title: "Your Library 📖",
    placement: "right",
  },
  {
    target: '[data-onboarding="collections"]',
    content: "Create collections to organize your entries and collaborate with others.",
    title: "Collections 📁",
    placement: "bottom",
  },
  {
    target: '[data-onboarding="share-collection"]',
    content: "Share collections with others and assign different roles: Viewer, Contributor, or Admin.",
    title: "Share & Collaborate 👥",
    placement: "left",
  },
  {
    target: '[data-onboarding="feed"]',
    content: "See what others are sharing and add interesting entries to your library with one click.",
    title: "Feed & Discover 🔍",
    placement: "bottom",
  },
  {
    target: "body",
    content: "You're all set! Start building your knowledge library with Corpus.",
    placement: "center",
    title: "Ready to Go! 🎉",
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    if (isOpen) {
      setRun(true);
      setStepIndex(0);
      analytics.onboardingStarted(session?.user?.id);
    }
  }, [isOpen, session]);

  const handleCallback = useCallback((data: any) => {
    const { status, type, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onClose();

      if (status === STATUS.FINISHED) {
        analytics.onboardingFinished(session?.user?.id);

        // Update user's onboarding status
        fetch("/api/user/onboarding-complete", {
          method: "POST",
        }).catch(console.error);
      }
    }

    if (type === "step:before") {
      analytics.onboardingStepCompleted(session?.user?.id, index);
    }
  }, [onClose, session]);

  if (!isOpen) return null;

  return (
    <Joyride
      steps={ONBOARDING_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
    />
  );
}
