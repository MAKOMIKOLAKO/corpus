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
    target: "body",
    content: "You're all set! Start building your knowledge library with Corpus. You can always restart this tour from the help menu.",
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

  const handleEvent = useCallback((data: any, controls: any) => {
    const { type, status, index, error } = data;

    // Log errors for debugging
    if (type === 'error:target_not_found') {
      console.error(`Onboarding target not found for step ${index}:`, data);
      // Skip to next step if target not found
      if (index < ONBOARDING_STEPS.length - 1) {
        setStepIndex(index + 1);
      } else {
        // End tour if it's the last step
        setRun(false);
        onClose();
      }
      return;
    }

    // Handle tour finish or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || type === 'tour:end') {
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

    // Track step completion before showing
    if (type === 'step:before') {
      analytics.onboardingStepCompleted(session?.user?.id, index);
    }

    // Update step index for controlled mode
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  }, [onClose, session]);

  if (!isOpen) return null;

  return (
    <Joyride
      steps={ONBOARDING_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      onEvent={handleEvent}
      debug={process.env.NODE_ENV === 'development'}
    />
  );
}
