/**
 * Shams Website - High-Performance Card Entrance & Scroll Animations
 * Works smoothly on both Mobile & Desktop with alternating Left/Right slide into position.
 */
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll(
    '.product-card, .consultation-title-box, .contact-social-bar, .featured-item'
  );

  if (!animatedElements.length) return;

  const isMobile = window.innerWidth <= 768;

  animatedElements.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    
    // Alternate direction: even index from right, odd index from left
    if (index % 2 === 0) {
      el.classList.add('animate-slide-right');
    } else {
      el.classList.add('animate-slide-left');
    }

    // Gentle stagger delay
    const staggerDelay = isMobile ? (index % 2) * 0.06 : (index % 3) * 0.1;
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
