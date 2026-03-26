"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  Shield,
  Link as LinkIcon,
  Edit,
  User,
  Mail
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  createdAt: string;
}

interface Props {
  user: User;
  totalConnections: number;
}

export default function ProfileClient({ user, totalConnections }: Props) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'sent' | 'received' | 'accepted'>('none');
  const [loading, setLoading] = useState(false);

  const isOwnProfile = session?.user?.id === user.id;

  useEffect(() => {
    if (!isOwnProfile && session?.user?.id) {
      checkConnectionStatus();
    }
  }, [session, user.id, isOwnProfile]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/connections/status/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.status);
        setIsConnected(data.status === 'accepted');
      }
    } catch (error) {
      console.error("Failed to check connection status");
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: user.id })
      });

      if (response.ok) {
        setConnectionStatus('sent');
        toast.success("Connection request sent!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send connection request");
      }
    } catch (error) {
      toast.error("Failed to send connection request");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-xl">
                {user.name?.[0] || user.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">
                  {user.name || `@${user.username}`}
                </h1>
              </div>

              {user.username && (
                <p className="text-muted-foreground mb-2">@{user.username}</p>
              )}

              {user.bio && (
                <p className="text-sm mb-4">{user.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(user.createdAt)}
                </span>

                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {totalConnections} connections
                </span>
              </div>
            </div>

            {!isOwnProfile && session && (
              <div className="mt-4">
                {connectionStatus === 'none' && (
                  <Button onClick={handleConnect} disabled={loading}>
                    <Users className="w-4 h-4 mr-2" />
                    {loading ? "Sending..." : "Connect"}
                  </Button>
                )}
                {connectionStatus === 'sent' && (
                  <Button disabled variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Request Sent
                  </Button>
                )}
                {connectionStatus === 'received' && (
                  <Link href="/connections">
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Respond to Request
                    </Button>
                  </Link>
                )}
                {connectionStatus === 'accepted' && (
                  <Button disabled variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Connected
                  </Button>
                )}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <Link href="/account/settings">
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  </div >
);
}
