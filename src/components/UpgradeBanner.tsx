'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface UpgradeBannerProps {
  message: string
  ctaText?: string
}

export default function UpgradeBanner({ message, ctaText = 'Upgrade to Pro' }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('upgrade-banner-dismissed')
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('upgrade-banner-dismissed', 'true')
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="w-full bg-accent-muted border-b border-border-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm text-content-primary">{message}</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-accent-foreground bg-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
              onClick={(e) => {
                if (window.location.pathname === '/alerts' && message.includes('Smart Alerts')) {
                  e.preventDefault();
                  window.location.href = '/pricing?return=/alerts';
                }
              }}
            >
              {ctaText}
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 inline-flex text-content-secondary hover:text-content-primary focus:outline-none transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
