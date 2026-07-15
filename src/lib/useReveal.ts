import { useEffect } from 'react';

/**
 * Scroll-reveal for anything marked `data-reveal`.
 *
 * IntersectionObserver rather than a scroll listener: no layout thrash, and it
 * unobserves each element once revealed so the work is strictly one-shot.
 * Elements are opacity:0 in CSS, so if JS never runs we'd hide the whole page —
 * hence the explicit fallback that reveals everything when IO is unavailable.
 */
export function useReveal(): void {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
