/**
 * Theme Manager for Aptitude Master
 * Handles light/dark mode toggling and persistence.
 */

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        // Add event listener to toggle button if it exists
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleTheme);
            this.updateIcon(toggleBtn);
        }
    },

    toggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            ThemeManager.updateIcon(toggleBtn);
        }
    },

    updateIcon(btn) {
        const isDark = document.body.classList.contains('dark');
        btn.textContent = isDark ? '☀️' : '🌙';
        btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

// LocalStorage persistence check
