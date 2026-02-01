/**
 * Aptirise Landing Page Logic
 * Handles theme toggling, auth checking, and scroll animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    initScrollAnimations();
});

/* ===== Theme Toggle ===== */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const icon = themeToggleBtn.querySelector('i');

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        icon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');

        // Update Icon
        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

/* ===== Auth Check ===== */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // User is logged in
        const dashboardBtn = document.getElementById('dashboard-link');
        if (dashboardBtn) {
            dashboardBtn.style.display = 'inline-flex';
        }
    }
}

/* ===== Scroll Animations ===== */
function initScrollAnimations() {
    // Add fade-in class to elements we want to animate
    const animatedElements = document.querySelectorAll('.card, .feature-box, .milestone-card, .hero-content, .hero-visual');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Animate once
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.classList.add('fade-in-section');
        observer.observe(el);
    });
}

// Additional CSS for animations (injected dynamically or assume in CSS)
// Since I cannot edit CSS easily right now without another step, 
// I will inject the animation styles here for completeness if they aren't in CSS.
// But `landing.css` didn't have specific animation classes.
// I will add a style block to head.

const style = document.createElement('style');
style.textContent = `
    .fade-in-section {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }
    
    .fade-in-section.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Staggered delays if needed, but per-element observation handles basic stagger by scroll position */
`;
document.head.appendChild(style);
