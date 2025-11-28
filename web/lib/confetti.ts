'use client';

import confetti from 'canvas-confetti';

export function fireConfetti() {
    // First burst - center
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24'],
    });

    // Second burst - left side
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#34d399', '#22d3ee', '#a78bfa'],
        });
    }, 150);

    // Third burst - right side
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#34d399', '#22d3ee', '#a78bfa'],
        });
    }, 300);
}

// Longer celebration for big moments
export function fireConfettiBurst() {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
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
}
