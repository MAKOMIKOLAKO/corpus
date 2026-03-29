'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, Sparkles, X } from 'lucide-react';

interface UpgradePromptProps {
  isOpen?: boolean;
  onClose?: () => void;
  reason: 'entry_limit_reached' | 'shared_collections_pro_only' |
  'personal_collection_limit_reached' | 'batch_actions_pro_only' |
  'contribution_pro_only' | 'advanced_search_pro_only' | 'journal_club_pro_only' |
  'alerts_pro_only';
  variant?: 'inline' | 'modal' | 'toast';
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  reason,
  variant = 'inline',
}) => {
  const getContent = () => {
    switch (reason) {
      case 'entry_limit_reached':
        return {
          title: "You've reached the free plan limit",
          description: "Free accounts can save up to 50 entries. Upgrade to Pro for unlimited entries, shared collections, batch actions, and more.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'shared_collections_pro_only':
        return {
          title: "Shared collections are a Pro feature",
          description: "Create shared collections with your lab, study group, or research collaborators. Invite members with custom roles and build your research network together.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'personal_collection_limit_reached':
        return {
          title: "You've used your free collection",
          description: "Free accounts include 1 personal collection. Upgrade to Pro for unlimited collections and the ability to create shared collaborative collections.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'batch_actions_pro_only':
        return {
          title: "Batch actions are a Pro feature",
          description: "Update reading status, add to collections, or delete multiple entries at once. Save time managing your research library.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'contribution_pro_only':
        return {
          title: "Contributing requires Pro",
          description: "The user you're inviting needs a Pro account to contribute to shared collections. They can still join as a Viewer for free.",
          cta: "Learn about Pro →",
          href: "/pricing"
        };
      case 'advanced_search_pro_only':
        return {
          title: "Advanced search is a Pro feature",
          description: "Use advanced search filters and operators to find exactly what you need in your research library.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'journal_club_pro_only':
        return {
          title: "Journal Club is a Pro feature",
          description: "Create journal clubs with scheduling, presenter assignment, voting, and attendance tracking. Organize your lab's paper reading sessions in one place.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      case 'alerts_pro_only':
        return {
          title: "Smart Alerts is a Pro feature",
          description: "Define up to 5 research interests and Corpus will automatically find and add new relevant papers to your library every day.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
      default:
        return {
          title: "Pro Feature",
          description: "Upgrade to Pro to unlock this feature and more.",
          cta: "Upgrade to Pro →",
          href: "/settings/billing"
        };
    }
  };

  const content = getContent();
  const modalContent = (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm dark:border-amber-900/30 dark:from-amber-900/10 dark:to-orange-900/5">
      {/* Decorative sparkles */}
      <div className="absolute -right-4 -top-4 text-amber-200/50 dark:text-amber-700/20">
        <Sparkles size={120} />
      </div>

      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
          <Crown size={24} />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            {content.title}
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {content.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href={content.href}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-amber-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {content.cta}
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 text-amber-400 hover:bg-amber-100/50 hover:text-amber-600 dark:hover:bg-amber-900/30"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'modal') {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md mx-4">
          {modalContent}
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm"
      >
        {modalContent}
      </motion.div>
    );
  }

  return modalContent;
};
