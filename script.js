/**
 * Shams Website - Modern Card Entrance & Scroll Animations
 * Uses IntersectionObserver for high-performance smooth animations.
 */
document.addEventListener('DOMContentLoaded', () => {
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

    // Add subtle staggered ripple delay per row
    const staggerDelay = (index % 3) * 0.12;
    el.style.transitionDelay = `${staggerDelay}s`;
  });

  // Check if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
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
    // Fallback for older browsers
    animatedElements.forEach((el) => el.classList.add('is-visible'));
  }
});
