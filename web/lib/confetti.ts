'use client';

import confetti from 'canvas-confetti';

export function fireConfettiBurst(): () => void {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    let cancelled = false;
    const interval: ReturnType<typeof setInterval> = setInterval(function () {
        if (cancelled) {
            clearInterval(interval);
            return;
        }

        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#f472b6'],
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#f472b6'],
        });
    }, 250);

    return () => {
        cancelled = true;
        clearInterval(interval);
    };
}
