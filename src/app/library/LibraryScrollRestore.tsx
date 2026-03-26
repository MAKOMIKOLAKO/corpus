'use client';

import { useLayoutEffect } from 'react';

export default function LibraryScrollRestore() {
    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const saved = sessionStorage.getItem('lib_scroll');
        if (saved === null) return;

        const targetY = parseInt(saved, 10);
        let rafId: number;
        let timedOut = false;

        // Safety: kill recursion after 2 seconds
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            cancelAnimationFrame(rafId);
            sessionStorage.removeItem('lib_scroll');
        }, 2000);

        const check = () => {
            if (timedOut) return;

            if (document.documentElement.scrollHeight >= targetY) {
                window.scrollTo({ top: targetY, behavior: 'instant' });
                sessionStorage.removeItem('lib_scroll');
                clearTimeout(timeoutId);
                return;
            }

            // Page not tall enough yet — wait for next frame
            rafId = requestAnimationFrame(check);
        };

        // Kick off the recursive check on the next frame
        rafId = requestAnimationFrame(check);

        return () => {
            clearTimeout(timeoutId);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return null;
}
