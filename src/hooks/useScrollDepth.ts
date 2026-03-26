'use client'

import { useEffect, useState } from 'react'

export function useScrollDepth(threshold: number = 60, onThresholdReached?: () => void) {
  const [hasReachedThreshold, setHasReachedThreshold] = useState(false)

  useEffect(() => {
    if (hasReachedThreshold) return

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100
      
      if (scrollPercentage >= threshold && !hasReachedThreshold) {
        setHasReachedThreshold(true)
        onThresholdReached?.()
      }
    }

    // Add scroll listener with throttling
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    
    // Check initial scroll position
    handleScroll()

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [threshold, hasReachedThreshold, onThresholdReached])

  return hasReachedThreshold
}
