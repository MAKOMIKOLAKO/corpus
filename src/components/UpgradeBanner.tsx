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
    <div className="w-full bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm text-amber-800">{message}</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              onClick={(e) => {
                // Check if we're on the alerts page and the link is for upgrading to use alerts
                if (window.location.pathname === '/alerts' && message.includes('Smart Alerts')) {
                  e.preventDefault();
                  // Redirect to pricing with a return URL
                  window.location.href = '/pricing?return=/alerts';
                }
              }}
            >
              {ctaText}
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 inline-flex text-amber-600 hover:text-amber-800 focus:outline-none transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
