# Aptitude Master 🧠 | Elite Preparation Platform

A web application for AI-generated aptitude practice designed to help college students prepare for competitive exams and placements. The platform features gamified progress, Milestone-based learning, and category-specific interactive sessions.

## 🚀 Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via Sequelize ORM)
- **AI**: Google Gemini API
- **Auth**: JWT (JSON Web Tokens) & Bcrypt

## ⚙️ Getting Started

### Prerequisites

- Node.js (v16.x or higher)
- npm (v8.x or higher)
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
3. Create a `.env` file in the root directory and add your credentials:
   ```env
   OPENAI_API_KEY=your_gemini_api_key
   PORT=3000
   JWT_SECRET=your_secret_key
   DB_PATH=./aptitude.sqlite
   ```

## 🖥️ Usage

1. Start the server:
   ```bash
   npm start
   ```
2. For development with auto-reload:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:3000`.

## 🛠️ API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user and receive JWT
- `GET /api/auth/profile` - Get current user profile (Protected)

### Practice Sessions
- `GET /api/milestones` - List all milestones and topics
- `POST /api/session/start` - Initialize a new practice session (Protected)
- `POST /api/session/submit` - Submit an answer and get feedback (Protected)
- `POST /api/session/result` - Finalize session and calculate XP (Protected)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
