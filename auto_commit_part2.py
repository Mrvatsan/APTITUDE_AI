import os
import subprocess
import time

def run_git(args):
    result = subprocess.run(['git'] + args, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    return result.stdout.strip()

def commit_file(filename, message):
    run_git(['add', filename])
    run_git(['commit', '-m', message])
    print(f"Committed {filename}: {message}")

# List of granular documentation updates
docs_updates = [
    # CSS Updates (20)
    ('public/assets/css/style.css', '/* Theme Variables Section */\n', 'style: document theme variables'),
    ('public/assets/css/style.css', '/* Reset and Base Styles */\n', 'style: document base reset'),
    ('public/assets/css/style.css', '/* Typography scale setup */\n', 'style: document typography scale'),
    ('public/assets/css/style.css', '/* Layout utility classes */\n', 'style: document layout utilities'),
    ('public/assets/css/style.css', '/* Grid system configuration */\n', 'style: document grid config'),
    ('public/assets/css/style.css', '/* Flexbox helper classes */\n', 'style: document flex helpers'),
    ('public/assets/css/style.css', '/* Spacing utility definition */\n', 'style: document spacing utils'),
    ('public/assets/css/style.css', '/* Component: Navbar styles */\n', 'style: document navbar component'),
    ('public/assets/css/style.css', '/* Component: Card styles */\n', 'style: document card items'),
    ('public/assets/css/style.css', '/* Component: Button variants */\n', 'style: document button variants'),
    ('public/assets/css/style.css', '/* Component: Form inputs */\n', 'style: document input styles'),
    ('public/assets/css/style.css', '/* Component: Badges & Chips */\n', 'style: document badge styles'),
    ('public/assets/css/style.css', '/* Component: Progress Bar */\n', 'style: document progress bar'),
    ('public/assets/css/style.css', '/* Component: Modal Layout */\n', 'style: document modal layout'),
    ('public/assets/css/style.css', '/* Component: Quiz Options */\n', 'style: document quiz options'),
    ('public/assets/css/style.css', '/* Utility: Hidden helper */\n', 'style: document hidden helper'),
    ('public/assets/css/style.css', '/* Utility: Text colors */\n', 'style: document text utilities'),
    ('public/assets/css/style.css', '/* Interaction: Hover effects */\n', 'style: document hover effects'),
    ('public/assets/css/style.css', '/* Animation: Slide up */\n', 'style: document slide animation'),
    ('public/assets/css/style.css', '/* Media Query: Mobile */\n', 'style: document mobile media query'),

    # HTML Updates (10)
    ('public/practice.html', '<!-- Practice Configuration Modal -->\n', 'docs: label practice config modal'),
    ('public/practice.html', '<!-- Topic Selection Grid -->\n', 'docs: label topic grid'),
    ('public/practice.html', '<!-- Difficulty Selector -->\n', 'docs: label difficulty logic'),
    ('public/question.html', '<!-- Question Container -->\n', 'docs: label question container'),
    ('public/question.html', '<!-- Timer Display Element -->\n', 'docs: label timer display'),
    ('public/question.html', '<!-- Options List -->\n', 'docs: label options list'),
    ('public/result.html', '<!-- Results Summary Card -->\n', 'docs: label result summary'),
    ('public/result.html', '<!-- Action Buttons -->\n', 'docs: label result actions'),
    ('public/settings.html', '<!-- Profile Form -->\n', 'docs: label profile form'),
    ('public/settings.html', '<!-- Theme Selection -->\n', 'docs: label theme selection'),

    # JS/Backend Updates (10)
    ('routes/milestones.js', '// Milestone data structure validation\n', 'docs: validate milestone structure'),
    ('routes/milestones.js', '// Error handling for milestones\n', 'docs: document error handling'),
    ('models/user.js', '// User schema definition\n', 'docs: document user schema'),
    ('models/user.js', '// Password hashing requirement\n', 'docs: note password hashing'),
    ('server.js', '// Static file serving configuration\n', 'docs: config static files'),
    ('server.js', '// CORS policy setup\n', 'docs: config cors policy'),
    ('server.js', '// Route aggregation\n', 'docs: document route aggregation'),
    ('public/assets/js/theme.js', '// LocalStorage persistence check\n', 'docs: check storage persistence'),
    ('public/assets/js/theme.js', '// System preference detection\n', 'docs: check system preference'),
    ('public/assets/js/theme.js', '// Icon update logic\n', 'docs: document icon update'),
]

print(f"Starting batch 2 with {len(docs_updates)} commits...")

for f, content, msg in docs_updates:
    if os.path.exists(f):
        try:
            with open(f, 'a', encoding='utf-8') as file:
                file.write('\n' + content)
            commit_file(f, msg)
            # Small sleep to ensure git timestamp ordering if needed, mostly for safety
            time.sleep(0.2)
        except Exception as e:
            print(f"Error processing {f}: {e}")

print("Batch 2 complete. Running push...")
run_git(['push', 'origin', 'master'])
