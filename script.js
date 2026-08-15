/**
 * Shams Website - High-Performance Card Entrance & Scroll Animations
 * Cards appear alternately: first card from left to right, next card from right to left, and so on.
 */
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll(
    '.product-card, .consultation-title-box, .contact-social-bar, .featured-item'
  );

  if (!animatedElements.length) return;

  const isMobile = window.innerWidth <= 768;

  animatedElements.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    
    // First card (even index: 0, 2, 4...) appears from Left to Right
    // Second card (odd index: 1, 3, 5...) appears from Right to Left
    if (index % 2 === 0) {
      el.classList.add('animate-from-left');
    } else {
      el.classList.add('animate-from-right');
    }

    // Stagger delay for fluid waterfall reveal
    const staggerDelay = isMobile ? (index % 2) * 0.08 : (index % 3) * 0.12;
    el.style.transitionDelay = `${staggerDelay}s`;
  });

  const revealElement = (el) => {
    el.classList.add('is-visible');
  };

  // Immediate visibility check for elements near or in the viewport
  const checkInitialVisibility = () => {
    const triggerBottom = window.innerHeight + 120;
    animatedElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < triggerBottom && rect.bottom > -50) {
        revealElement(el);
      }
    });
  };

  // IntersectionObserver for smooth scroll detection
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.02,
      rootMargin: '100px 0px 50px 0px'
    });

    animatedElements.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });
  }

  // Trigger checks immediately on load so top cards animate right away
  checkInitialVisibility();
  requestAnimationFrame(checkInitialVisibility);
  setTimeout(checkInitialVisibility, 150);

  // Smooth scroll listener as reliable backup
  window.addEventListener('scroll', checkInitialVisibility, { passive: true });
});
