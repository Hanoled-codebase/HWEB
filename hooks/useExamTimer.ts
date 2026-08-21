import { useState, useEffect, useCallback } from "react";

export function useExamTimer(
  startedAt: string | Date | null,
  durationMinutes: number,
  onExpire?: () => void
) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setTimeLeft(null);
      return;
    }

    const start = new Date(startedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const end = start + durationMs;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        if (onExpire) onExpire();
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);

    return () => clearInterval(timerId);
  }, [startedAt, durationMinutes, onExpire]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    timeLeft,
    isExpired: timeLeft === 0,
    formattedTime: timeLeft !== null ? formatTime(timeLeft) : "--:--",
  };
}
