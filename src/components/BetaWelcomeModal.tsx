"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function BetaWelcomeModal() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-border-cream bg-ivory text-content-primary">
        <DialogHeader className="space-y-3">
          <Badge variant="default" className="w-fit">Beta Tester</Badge>
          <DialogTitle className="text-2xl font-medium leading-tight">Welcome to the Corpus beta.</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 text-sm leading-7 text-content-secondary">
              <p>
                You&apos;re getting early access while things are still being shaped. The goal is simple: make
                research discovery faster, clearer, and actually useful day to day. Expect a few rough edges—I&apos;m
                actively refining the experience.
              </p>
              <p>
                If something feels off, confusing, or slow, I want to hear it. Strong feedback directly shapes what
                gets built next. Users who give thoughtful, consistent input will get free Pro access as a thank you.
              </p>
              <p>
                Reach me anytime at <a className="text-terracotta underline underline-offset-2" href="mailto:mfangajei3@gatech.edu">mfangajei3@gatech.edu</a>.
              </p>
              <p>Glad to have you here.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
