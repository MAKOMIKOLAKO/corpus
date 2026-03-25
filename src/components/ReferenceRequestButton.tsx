"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

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
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Don't show if it's the user's own entry
  if (session?.user?.id === owner.id) {
    return null;
  }

  const handleRequest = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/reference-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          ownerId: owner.id,
          message: message.trim() || undefined
        })
      });

      if (response.ok) {
        setShowModal(false);
        setMessage("");
        toast.success("Reference request sent");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send request");
      }
    } catch (error) {
      toast.error("Failed to send request");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className={className}
      >
        <Send className="w-4 h-4 mr-2" />
        Request Access
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Reference Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{entry.title}</p>
              <p className="text-sm text-muted-foreground">
                {entry.authors.slice(0, 3).join(", ")}
                {entry.authors.length > 3 && " et al."}
                {entry.year && ` (${entry.year})`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Requesting from: {owner.name || owner.username}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Message (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message explaining why you'd like access..."
                maxLength={280}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/280 characters
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequest}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
