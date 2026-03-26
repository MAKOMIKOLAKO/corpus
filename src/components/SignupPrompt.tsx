'use client'

import { useState } from 'react'
import { X, Bookmark, Library } from 'lucide-react'
import { useSavedEntries } from '@/hooks/useSavedEntries'

interface SignupPromptProps {
  isOpen: boolean
  onClose: () => void
}

export default function SignupPrompt({ isOpen, onClose }: SignupPromptProps) {
  const { count } = useSavedEntries()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 200)
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'
      }`}>
      <div className={`bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all duration-200 ${isClosing ? 'scale-95' : 'scale-100'
        }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bookmark className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Create a free account
              </h3>
              <p className="text-sm text-gray-600">
                to keep your saved papers
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Library className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{count}</span>
            <span className="text-gray-600">
              paper{count !== 1 ? 's' : ''} saved
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Don&apos;t lose your research! Sign up to sync your saved papers across devices and access them anytime.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href="/signup"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            Sign up free
          </a>
          <button
            onClick={handleClose}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Maybe later
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          No credit card required • Free forever for personal use
        </p>
      </div>
    </div>
  )
}
