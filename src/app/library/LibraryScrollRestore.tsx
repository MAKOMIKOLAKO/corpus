'use client';

import { useEffect } from 'react';

export default function LibraryScrollRestore() {
    useEffect(() => {
        // Check if we have a saved scroll position
        const savedScrollPos = sessionStorage.getItem('libraryScrollPos');
        
        if (!savedScrollPos) {
            return;
        }

        const targetScrollY = parseInt(savedScrollPos, 10);
        
        // Function to check if page has enough content and restore scroll
        const attemptScrollRestore = () => {
            // Check if the page has enough height to scroll to the saved position
            if (document.body.scrollHeight > targetScrollY) {
                // Page is tall enough - restore scroll position instantly
                window.scrollTo({
                    top: targetScrollY,
                    behavior: 'instant'
                });
                
                // Clean up immediately after successful scroll
                sessionStorage.removeItem('libraryScrollPos');
                return true;
            }
            return false;
        };

        // Try immediately in case content is already loaded
        if (attemptScrollRestore()) {
            return;
        }

        // If not, set up a mutation observer to detect when content is added
        const observer = new MutationObserver(() => {
            if (attemptScrollRestore()) {
                observer.disconnect();
            }
        });

        // Start observing the body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        // Fallback: try with requestAnimationFrame for a few frames
        let frameCount = 0;
        const maxFrames = 30; // About 0.5 seconds at 60fps
        
        const checkWithRAF = () => {
            if (frameCount >= maxFrames) {
                observer.disconnect();
                return;
            }
            
            if (!attemptScrollRestore()) {
                frameCount++;
                requestAnimationFrame(checkWithRAF);
            } else {
                observer.disconnect();
            }
        };
        
        requestAnimationFrame(checkWithRAF);

        // Cleanup
        return () => {
            observer.disconnect();
        };
    }, []);

    return null;
}
