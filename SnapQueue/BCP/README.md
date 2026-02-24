# BCP Full-Stack Integration

This repository now includes a full-stack integration scaffold:

- `backend/`: Node.js + Express + MongoDB REST API
- `frontend/`: React + Vite application with route/page structure mapped from current HTML pages
- `docs/SYSTEM_ANALYSIS.md`: Existing system analysis and migration mapping

## 1. Folder Structure

```text
backend/
  src/
    config/
    controllers/
    middlewares/
    models/
    routes/
    utils/
  package.json
  .env.example

frontend/
  src/
    components/
    context/
    pages/
    services/
    App.jsx
    main.jsx
    styles.css
  package.json
  .env.example
```

## 2. Backend Setup (Node.js + MongoDB)

1. Open a terminal in `backend/`.
2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update `.env` values:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/myAppDB?retryWrites=true&w=majority
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

5. (Optional) Seed default data:

```bash
npm run seed
```

6. Run backend:

```bash
npm run dev
```

Backend base URL: `http://localhost:5000/api`

## 3. Frontend Setup (React)

1. Open a terminal in `frontend/`.
2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Start frontend:

```bash
npm start
```

Frontend URL: `http://localhost:3000`

## 4. MongoDB Setup Instructions

1. Install MongoDB locally or create a MongoDB Atlas account.
2. Create a database named `myAppDB` (or update `.env` to your preferred name).
3. Use the backend model definitions to create collections automatically on first write:
   - `users`
   - `reservations`
   - `payments`
   - `galleryitems`
   - `chatqas`
   - `contactmessages`
4. Set your connection string in `backend/.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/myAppDB?retryWrites=true&w=majority
```

5. Run seed data if needed:

```bash
npm run seed
```

## 5. API Overview

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/auth/me`
- `POST /api/reservations`
- `GET /api/reservations`
- `GET /api/reservations/:id`
- `PATCH /api/reservations/:id/status`
- `POST /api/payments`
- `GET /api/payments`
- `PATCH /api/payments/:id/status`
- `GET /api/gallery`
- `POST /api/gallery`
- `PATCH /api/gallery/:id`
- `DELETE /api/gallery/:id`
- `GET /api/chatbot/qa`
- `POST /api/chatbot/qa`
- `PATCH /api/chatbot/qa/:id`
- `DELETE /api/chatbot/qa/:id`
- `POST /api/contact`
- `GET /api/contact`
- `PATCH /api/contact/:id/status`

## 6. Data Flow Verification Checklist

1. Sign up/sign in from React login page.
2. Create reservation from reservation page.
3. Submit payment for saved reservation.
4. Verify reservation status in dashboard.
5. Update reservation status in admin page.
6. Load gallery items from API.
7. Load chatbot Q&A from API and verify responses.

## 7. Optional Enhancements (Next)

- Add role-based access control for admin routes.
- Add request validation middleware (e.g. Zod/Joi).
- Add file upload service for payment proofs and gallery media.
- Add centralized logging and monitoring.
- Add Redux/Context module expansion for complex global state.
