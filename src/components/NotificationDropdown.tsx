'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiKey } from '@/hooks/useApiKey';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { data: session } = useSession();
  const apikey = useApiKey();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notification count
  const fetchNotificationCount = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/notifications/count', {
        headers: { 'x-api-key': apikey || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (loadMore = false) => {
    if (!session?.user?.id || loading) return;

    setLoading(true);

    try {
      const cursor = loadMore && notifications.length > 0
        ? notifications[notifications.length - 1].id
        : undefined;

      const response = await fetch(
        `/api/notifications?limit=20${cursor ? `&cursor=${cursor}` : ''}`,
        { headers: { 'x-api-key': apikey || '' } }
      );

      if (response.ok) {
        const data = await response.json();

        if (loadMore) {
          setNotifications(prev => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }

        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || ''
        },
        body: JSON.stringify({ notificationIds: [notificationId] })
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apikey || ''
        },
        body: JSON.stringify({})
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to collection if it's a smart alert
    if (notification.type === 'SMART_ALERT' && notification.metadata?.collectionId) {
      setIsOpen(false);
    }
  };

  // Format relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll for notification count
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 60000); // Every minute

    return () => clearInterval(interval);
  }, [session?.user?.id, apikey]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)]/10 rounded-md transition-colors touch-manipulation relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--destructive)] text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7 px-2"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-80">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-[var(--accent)] cursor-pointer transition-colors ${!notification.read ? 'bg-[var(--muted)]/20' : ''
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {notification.type === 'SMART_ALERT' && notification.metadata?.collectionId && (
                            <Link
                              href={`/collections/${notification.metadata.collectionId}`}
                              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View collection
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Load More */}
          {hasMore && (
            <div className="p-2 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNotifications(true)}
                disabled={loading}
                className="w-full text-xs"
              >
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
