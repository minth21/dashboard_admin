import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useIdleTimer = () => {
    const timeoutRef = useRef<number | null>(null);

    const logout = () => {
        // Clear auth token
        localStorage.removeItem('admin_token');

        // Redirect to login using window.location
        window.location.href = '/login';
    };

    const resetTimer = () => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = window.setTimeout(() => {
            logout();
        }, IDLE_TIMEOUT);
    };

    useEffect(() => {
        // Events that indicate user activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Reset timer on any activity
        const handleActivity = () => {
            resetTimer();
        };

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
};
