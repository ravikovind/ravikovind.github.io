
document.addEventListener('DOMContentLoaded', () => {

    // --- Scroll Progress Bar ---
    function updateScrollProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
    }
    window.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress();

    // --- Scroll Animations with Intersection Observer ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Apply animation class to sections
    const sections = document.querySelectorAll('section');
    sections.forEach(el => {
        el.classList.add('fade-in-section');
        observer.observe(el);
    });

    // Staggered card animations in bento grid
    const bentoCards = document.querySelectorAll('.bento-grid .card');
    bentoCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    // Timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        observer.observe(item);
    });

    // Project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.classList.add('fade-in-section');
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    // --- Header Background on Scroll ---
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(0, 0, 0, 0.95)';
        } else {
            header.style.background = 'rgba(0, 0, 0, 0.7)';
        }
    });

    // --- Parallax Effect for Background Glows ---
    const topGlow = document.querySelector('.background-glow.top-left');
    const bottomGlow = document.querySelector('.background-glow.bottom-right');

    if (topGlow && bottomGlow) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            topGlow.style.transform = `translate(${scrollY * 0.03}px, ${scrollY * 0.05}px)`;
            bottomGlow.style.transform = `translate(-${scrollY * 0.03}px, -${scrollY * 0.05}px)`;
        });
    }

    // --- Mouse-Follow Card Glow ---
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--mouse-x', '50%');
            card.style.setProperty('--mouse-y', '50%');
        });
    });

    // --- Button Ripple Effect ---
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            btn.style.setProperty('--ripple-x', `${x}%`);
            btn.style.setProperty('--ripple-y', `${y}%`);
        });
    });

    // --- Hero Title Word Animation ---
    // Simplified: Just add animation class to hero section, don't manipulate innerHTML
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.classList.add('is-visible');
    }

    // --- Typing Animation ---
    const typingText = document.querySelector('.typing-text');
    if (typingText) {
        const words = ['Clarity.', 'Correctness.', 'Scalability.', 'Ownership.', 'User Focus.', 'Ecosystems.'];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let isPaused = false;

        function type() {
            const currentWord = words[wordIndex];

            if (isPaused) {
                setTimeout(type, 1500);
                isPaused = false;
                isDeleting = true;
                return;
            }

            if (isDeleting) {
                typingText.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;

                if (charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    setTimeout(type, 300);
                    return;
                }
            } else {
                typingText.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;

                if (charIndex === currentWord.length) {
                    isPaused = true;
                    setTimeout(type, 100);
                    return;
                }
            }

            const speed = isDeleting ? 50 : 100;
            setTimeout(type, speed);
        }

        // Start typing after a short delay
        setTimeout(type, 1000);
    }

    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');

            const isExpanded = mobileMenuBtn.classList.contains('active');
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
        });

        // Close menu when a link is clicked
        const navLinkItems = navLinks.querySelectorAll('a');
        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- Tech Stack Auto-Scroll with Manual Override ---
    const techScrollWrapper = document.querySelector('.tech-scroll-wrapper');
    if (techScrollWrapper) {
        let isPaused = false;
        let resumeTimeout;
        const scrollSpeed = 0.5; // pixels per frame

        // Auto-scroll function
        function autoScroll() {
            if (!isPaused) {
                techScrollWrapper.scrollLeft += scrollSpeed;
                // Reset to start when reaching halfway (for seamless loop)
                const maxScroll = techScrollWrapper.scrollWidth / 2;
                if (techScrollWrapper.scrollLeft >= maxScroll) {
                    techScrollWrapper.scrollLeft = 0;
                }
            }
            requestAnimationFrame(autoScroll);
        }

        // Start auto-scroll
        requestAnimationFrame(autoScroll);

        // Pause on hover
        techScrollWrapper.addEventListener('mouseenter', () => {
            isPaused = true;
            clearTimeout(resumeTimeout);
        });

        techScrollWrapper.addEventListener('mouseleave', () => {
            resumeTimeout = setTimeout(() => {
                isPaused = false;
            }, 1000);
        });

        // Pause on manual scroll/touch
        let lastScrollLeft = 0;
        techScrollWrapper.addEventListener('scroll', () => {
            // Detect manual scroll (significant change)
            if (Math.abs(techScrollWrapper.scrollLeft - lastScrollLeft) > 2) {
                isPaused = true;
                clearTimeout(resumeTimeout);
                resumeTimeout = setTimeout(() => {
                    isPaused = false;
                }, 3000);
            }
            lastScrollLeft = techScrollWrapper.scrollLeft;
        });

        techScrollWrapper.addEventListener('touchstart', () => {
            isPaused = true;
            clearTimeout(resumeTimeout);
        });

        techScrollWrapper.addEventListener('touchend', () => {
            resumeTimeout = setTimeout(() => {
                isPaused = false;
            }, 3000);
        });
    }

});
