# AptiRise 🧠 | Elite Preparation Platform

A web application for AI-generated aptitude practice designed to help college students prepare for competitive exams and placements. The platform features gamified progress, Milestone-based learning, and category-specific interactive sessions.

## ✨ Features

### 🎯 Core Practice Modes
- **Suggested Today**: Daily random topic selection with a **5-hour cooldown** mechanism to encourage disciplined practice.
- **Focus Weak Areas**: Automatically unlocks after 10 sessions. Targets topics where your accuracy is below 60%.
- **Random Practice**: Quick-start mode with auto-detected difficulty based on your history.
- **Milestone Journey**: Structured curriculum with 32 topics divided into 6 progressive milestones.

### 🧠 Intelligent Assessment
- **AI-Powered Questions**: Dynamic question generation via **Google Gemini API** ensures endless variety.
- **Robust Fallback System**: Local database of 150+ high-quality questions ensures the app works even offline or if the API limits are reached.
- **Auto-Difficulty**: System adapts question count (5-15) and difficulty based on user experience level.

### 🎮 Gamification & Progress
- **XP System**: Earn XP for every correct answer.
- **Badge Tiers**: Progress from **Iron** 🛡️ to **Master** 👑 based on total XP.
- **Streaks**: Daily login streaks to build habit.
- **Visual Feedback**: Confetti celebrations for high scores and level-ups.

## 🚀 Experience Workflow

1.  **Onboarding**: Create an account with your goals (Placements/Exams) and milestone preferences.
2.  **Dashboard**: 
    - View your "Current Rank", "Total XP", and "Streak".
    - Check the "Suggested Today" card for your daily challenge.
3.  **Practice**:
    - **Suggested**: One-click start for a random topic.
    - **Weak Areas**: Lock/Unlock mechanism guides you to improve liabilities.
    - **Milestones**: Browse topics by category (Number System, Data Interpretation, etc.).
4.  **Session**: 
    - Timer-based interface.
    - Instant feedback on submission.
    - standard "Review" mode to learn from mistakes.
5.  **Results**:
    - Detailed performance analytics (Accuracy, Time Taken).
    - AI-generated "Thinking Pattern" analysis and "Improvement Tips".
    - XP calculation and immediate Badge updates.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (No framework overhead)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via Sequelize ORM) for persistent user data & history
- **AI**: Google Gemini API for real-time content generation
- **Auth**: JWT (JSON Web Tokens) & Bcrypt for secure access

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16.x or higher)
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mrvatsan/APTITUDE_AI.git
   cd APTITUDE_AI
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_gemini_api_key
   PORT=3000
   JWT_SECRET=your_secret_key
   DB_PATH=./aptitude.sqlite
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
5. Navigate to `http://localhost:3000`
