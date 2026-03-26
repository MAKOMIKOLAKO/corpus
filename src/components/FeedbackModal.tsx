"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Star, Send, X, MessageSquare } from "lucide-react";
import { analytics } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// Custom DialogContent with overlay
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-transparent data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
CustomDialogContent.displayName = "CustomDialogContent";

interface FeedbackModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FeedbackModal({ trigger, open, onOpenChange }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { data: session } = useSession();

  // Pre-fill email if user is logged in
  useState(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          email: email || null,
          rating: rating || null,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        analytics.feedbackSubmitted(session?.user?.id, {
          hasRating: !!rating,
          rating: rating || null,
        });

        // Reset form after delay
        setTimeout(() => {
          setMessage("");
          setRating(0);
          setSubmitted(false);
          setIsOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (newOpen) {
      analytics.feedbackModalOpened(session?.user?.id);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <MessageSquare className="w-4 h-4 mr-2" />
      Feedback
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <CustomDialogContent className="sm:max-w-[425px] bg-background border shadow-xl">
        <DialogHeader>
          <DialogTitle>Send us your feedback</DialogTitle>
          <DialogDescription>
            Help us improve Corpus by sharing your thoughts, suggestions, or report issues.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank you for your feedback!</h3>
            <p className="text-muted-foreground">We appreciate your input and will use it to improve Corpus.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="message">What do you like or dislike? What could be better?</Label>
              <Textarea
                id="message"
                placeholder="Share your thoughts..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 min-h-[100px]"
                required
              />
            </div>

            <div>
              <Label>Rating (optional)</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 hover:scale-110 transition-transform"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                  >
                    <Star
                      className={`w-6 h-6 ${star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only if you'd like us to follow up with you
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!message.trim() || isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Feedback"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </CustomDialogContent>
    </Dialog>
  );
}
