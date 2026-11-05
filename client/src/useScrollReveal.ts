import { useEffect } from 'react';

/** Елементи, които се появяват плавно при скролване. */
const SELECTOR = [
  'h1', 'h2', '.section-head', '.card', '.glass', '.hero-text > *', '.hero-art',
  '.tabs', '.pagination', '.catalog-head', '.breadcrumbs', '.product-gallery', '.product-info > *',
  '.footer-grid > div', '.empty', '.reveal-block',
].join(',');

/** Тези никога не се анимират — плаващи менюта, модали, хедър. */
const EXCLUDE = '.header, .modal-backdrop, .dropdown, .toasts, .t-track';

const DURATION = 800;
const STAGGER = 90;

/**
 * Глобален scroll reveal: всяка секция, карта и заглавие се появява с fade-in и
 * леко движение нагоре (24px), когато влезе в екрана. Следи и динамично заредено съдържание.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          el.classList.add('reveal-in');
          const delay = parseFloat(el.style.transitionDelay) || 0;
          // След анимацията махаме класовете, за да работят нормалните hover ефекти.
          window.setTimeout(() => {
            el.dataset.revealDone = '1';
            el.classList.remove('reveal', 'reveal-in');
            el.style.transitionDelay = '';
          }, DURATION + delay + 50);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.dataset.revealDone || el.closest(EXCLUDE)) return;
        // Вече чакащ елемент (напр. след повторно стартиране на ефекта) — само го следим отново.
        if (el.classList.contains('reveal')) {
          io.observe(el);
          return;
        }
        // Ако родителят вече ще се анимира, не анимираме и детето два пъти.
        if (el.parentElement?.closest('.reveal')) return;
        el.classList.add('reveal');
        const parent = el.parentElement;
        if (parent && (parent.classList.contains('grid') || parent.classList.contains('orders-list'))) {
          const index = Array.prototype.indexOf.call(parent.children, el);
          el.style.transitionDelay = `${(index % 4) * STAGGER}ms`;
        }
        io.observe(el);
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };

    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}
