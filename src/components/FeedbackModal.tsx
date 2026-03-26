"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Star, Send, X, MessageSquare } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  React.useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email]);

  // Sync internal state with prop
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

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

  return (
    <>
      {trigger}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white border rounded-lg shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Send us your feedback</h3>
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Help us improve Corpus by sharing your thoughts, suggestions, or report issues.
            </p>

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

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!message.trim() || isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Sending..." : "Send Feedback"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
