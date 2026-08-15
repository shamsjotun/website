/**
 * Shams Website - Modern Card Entrance & Scroll Animations
 * Uses IntersectionObserver on desktop.
 * On mobile, elements remain in natural static layout to prevent viewport clipping and rendering delays.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Disable JS scroll transformations on mobile devices to ensure 100% stable layout
  if (window.innerWidth <= 768) {
    return;
  }

  const animatedElements = document.querySelectorAll(
    '.product-card, .consultation-title-box, .contact-social-bar, .featured-item'
  );

  animatedElements.forEach((el, index) => {
    el.classList.add('animate-on-scroll');
    
    // Alternate direction: even index from right, odd index from left
    if (index % 2 === 0) {
      el.classList.add('animate-slide-right');
    } else {
      el.classList.add('animate-slide-left');
    }

    // Subtle staggered ripple delay per row
    const staggerDelay = (index % 3) * 0.12;
    el.style.transitionDelay = `${staggerDelay}s`;
  });

  // Check if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback
    animatedElements.forEach((el) => el.classList.add('is-visible'));
  }
});
