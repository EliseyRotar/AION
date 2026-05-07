# AION - AI Hub Enterprise

<div align="center">

![AION Logo](logo.png)

**A powerful multi-agent AI platform with RAG capabilities**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/react-19.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com/)

</div>

## 🌟 Features

- **Multi-Agent System**: Create and manage multiple AI agents with specialized knowledge bases
- **RAG (Retrieval-Augmented Generation)**: Upload documents (PDF, DOCX, TXT) to enhance AI responses with contextual information
- **User Management**: Role-based access control (Admin/User) with secure authentication
- **Real-time Chat**: Stream responses with SSE (Server-Sent Events)
- **Group Collaboration**: Organize agents into groups for team-based workflows
- **Usage Analytics**: Track message counts, token usage, and system activity
- **Audit Logging**: Comprehensive logging of all system actions
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EliseyRotar/AION.git
   cd AION
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   
   Create a `backend/.env` file:
   ```env
   # Groq API Key (get yours at https://console.groq.com)
   GROQ_API_KEY=your_groq_api_key_here
   
   # Default AI Model
   DEFAULT_MODEL=llama-3.3-70b-versatile
   
   # Security (CHANGE IN PRODUCTION!)
   SECRET_KEY=your-super-secret-key-change-in-production
   
   # Admin Account
   DEFAULT_ADMIN_EMAIL=admin@aihub.com
   DEFAULT_ADMIN_PASSWORD=Admin123!
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Set up the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Using the Batch Scripts (Windows)

For Windows users, convenient batch scripts are provided:

- `install.bat` - Install all dependencies
- `start.bat` - Start both backend and frontend servers
- `stop.bat` - Stop all running servers
- `reinstall-backend.bat` - Reinstall backend dependencies

## 📖 Documentation

### Architecture

```
AION/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # Application entry point
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── auth.py      # Authentication logic
│   │   ├── rag_engine.py # RAG implementation
│   │   └── routes/      # API endpoints
│   ├── alembic/         # Database migrations
│   ├── tests/           # Test suite
│   └── uploads/         # User-uploaded documents
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       ├── context/     # React context providers
│       └── services/    # API client
└── docs/                # Additional documentation
```

### Key Technologies

**Backend:**
- FastAPI - Modern, fast web framework
- SQLAlchemy - SQL toolkit and ORM
- LangChain - LLM application framework
- FAISS - Vector similarity search
- Groq - Fast LLM inference
- Alembic - Database migrations

**Frontend:**
- React 19 - UI library
- Vite - Build tool
- Tailwind CSS - Utility-first CSS
- Axios - HTTP client
- React Router - Navigation
- Framer Motion - Animations

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

#### Users
- `GET /api/users/me` - Get current user
- `GET /api/users` - List all users (Admin)
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/{id}` - Update user (Admin)
- `DELETE /api/users/{id}` - Delete user (Admin)

#### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent
- `POST /api/agents/{id}/upload` - Upload document to agent

#### Chat
- `POST /api/chat` - Send message (streaming response)
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation details

#### Analytics
- `GET /api/stats/dashboard` - Dashboard statistics
- `GET /api/audit-logs` - Audit log entries

For complete API documentation, visit http://localhost:8000/docs when running the server.

## 🧪 Testing

Run the test suite:

```bash
cd backend
pytest
```

Run with coverage:

```bash
pytest --cov=app --cov-report=html
```

## 🔒 Security

### Important Security Notes

⚠️ **Before deploying to production:**

1. **Change default credentials** in `.env`:
   - Generate a strong `SECRET_KEY` (use `openssl rand -hex 32`)
   - Change `DEFAULT_ADMIN_PASSWORD` to a strong password

2. **Secure your API keys**:
   - Never commit `.env` files to version control
   - Use environment variables or secret management services in production

3. **Update CORS settings** in `backend/app/main.py`:
   - Replace `allow_origins=["http://localhost:5173"]` with your production domain

4. **Enable HTTPS** in production

5. **Review rate limiting** settings for your use case

### Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- SQL injection protection via SQLAlchemy ORM
- CORS configuration
- Input validation with Pydantic
- Audit logging for all critical actions

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint rules for JavaScript/React code
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for fast LLM inference
- [LangChain](https://langchain.com/) for RAG framework
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent web framework
- [React](https://reactjs.org/) and the React community

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

<div align="center">
Made with ❤️ by the AION team
</div>
