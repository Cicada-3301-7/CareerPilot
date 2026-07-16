# CareerPilot

CareerPilot is a full-stack job application tracker built on the MERN stack. It lets you capture every application you send out, watch your pipeline at a glance, and keep the details — status, priority, deadlines, notes — organized while you hunt. It is fully multi-user: every account sees only its own data, enforced at the database-query level.

## Screenshots

> Screenshots coming soon.
>
> <!-- ![Dashboard](docs/screenshots/dashboard.png) -->
> <!-- ![Login](docs/screenshots/login.png) -->

## Tech Stack

**Frontend**

- React 18
- Vite
- Axios

**Backend**

- Node.js
- Express
- MongoDB
- Mongoose
- JWT (jsonwebtoken)
- Zod

**Testing**

- Jest
- Supertest (with mongodb-memory-server)

**CI/CD**

- GitHub Actions

**Deployment**

- Render (backend)
- Vercel (frontend)

## Features

- **User accounts** — registration and login with bcrypt-hashed passwords (cost factor 12)
- **JWT authentication** — 7-day tokens; every application query is scoped to the authenticated user
- **Logout from all devices** — token revocation invalidates every previously issued token
- **Job application CRUD** — create, list, update, and delete applications
- **Search** — case-insensitive search across company, role, location, and notes (regex-safe)
- **Filtering** — by status, work mode, and date range (Today / Last 7 Days / Last 30 Days)
- **Sorting** — newest, oldest, company A–Z/Z–A, role A–Z, status, deadline
- **Pagination** — opt-in `page`/`limit` query params with a metadata envelope; omitting them returns the full list
- **Work mode** — structured Remote / Hybrid / Onsite field alongside free-text location
- **Applied date** — per-application `appliedAt` timestamp, defaulting to creation time
- **URL validation** — job links must be valid `http(s)` URLs
- **Health endpoint** — `GET /healthz` reports service and database status
- **Rate limiting** — login and registration are limited to 10 requests per 15 minutes per IP
- **Input validation** — strict Zod schemas reject unknown fields (mass-assignment protection)
- **Centralized error handling** — consistent JSON error responses across the API
- **Security headers & logging** — Helmet and Morgan configured per environment
- **Responsive frontend** — single-page dashboard with optimistic status updates and debounced search

## Project Structure

```text
careerpilot/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx              # Router, pages, dashboard
│   │   ├── api.js               # Axios instance with auth interceptors
│   │   ├── main.jsx
│   │   └── styles.css
│   └── vite.config.js
├── server/                      # Express + Mongoose REST API
│   ├── src/
│   │   ├── config/              # Env validation, database connection
│   │   ├── controllers/         # Request handlers (auth, applications)
│   │   ├── middleware/          # Auth, validation, rate limiting, errors
│   │   ├── models/              # Mongoose schemas (User, Application)
│   │   ├── routes/              # Route definitions (thin, no business logic)
│   │   ├── validators/          # Zod schemas
│   │   ├── utils/               # AppError, asyncHandler
│   │   └── app.js               # Express app wiring (no listen)
│   ├── tests/                   # Jest + Supertest integration suite
│   ├── jest.config.js
│   └── server.js                # Entry point: env → connect → listen
└── .github/workflows/ci.yml     # CI pipeline
```

## Installation

### Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repository

```bash
git clone https://github.com/Cicada-3301-7/CareerPilot.git
cd CareerPilot
```

### 2. Backend setup

```bash
cd server
npm install
cp .env.example .env   # then edit .env with your values
npm run dev
```

The terminal should show `Connected to MongoDB` and `CareerPilot API listening on port 5000`.

### 3. Frontend setup

In a second terminal:

```bash
cd client
npm install
cp .env.example .env   # then edit .env if your API runs elsewhere
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`).

## Environment Variables

**`server/.env`** (see `server/.env.example`)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. The server exits at startup if unset. |
| `JWT_SECRET` | Yes | Secret used to sign auth tokens. Use a long, random value (32+ characters). |
| `PORT` | No | API port. Defaults to `5000`; Render supplies it in production. |

**`client/.env`** (see `client/.env.example`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend origin, e.g. `http://localhost:5000`. Embedded at build time — rebuild after changing it. |

## Available Scripts

**Backend (`server/`)**

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with nodemon (auto-restart) |
| `npm start` | Start the API in production mode |
| `npm test` | Run the full Jest test suite |

**Frontend (`client/`)**

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `client/dist` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## API Overview

All `/api/applications` routes and `/api/auth/me` / `/api/auth/logout-all` require an `Authorization: Bearer <token>` header.

**Authentication**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, returns a JWT and the user |
| POST | `/api/auth/login` | Log in, returns a JWT and the user |
| GET | `/api/auth/me` | Get the current user |
| POST | `/api/auth/logout-all` | Invalidate all previously issued tokens |

**Applications**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/applications` | List applications. Supports `search`, `status`, `workMode`, `dateRange`, `sort`, and opt-in `page`/`limit` pagination |
| POST | `/api/applications` | Create an application |
| PATCH | `/api/applications/:id` | Update supplied fields |
| DELETE | `/api/applications/:id` | Delete an application |

**Health**

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Service health and database connection state |

## Testing

The backend ships with **71 automated tests** covering authentication, authorization boundaries, CRUD, search/filter/sort/pagination contracts, validation, rate limiting, and token revocation. Tests run against an in-memory MongoDB instance — no database setup or environment variables required.

```bash
cd server
npm test
```

## CI/CD

Every push and pull request triggers the GitHub Actions workflow (`.github/workflows/ci.yml`), which runs two parallel jobs:

- **client-lint** — installs the frontend and runs ESLint
- **server-test** — installs the backend and runs the full Jest suite against an in-memory MongoDB

Both jobs must pass for the pipeline to be green.

## Deployment

The production layout is **MongoDB Atlas** (database) + **Render** (API) + **Vercel** (frontend).

**Backend on Render**

1. Create a Web Service from this repository with **Root Directory** `server`, **Build Command** `npm install`, **Start Command** `npm start`.
2. Set the `MONGODB_URI` and `JWT_SECRET` environment variables. `PORT` is supplied by Render automatically.
3. Verify the deploy by opening the service URL (`{"message":"CareerPilot API is running"}`) or `/healthz`.

**Frontend on Vercel**

1. Import the repository with **Root Directory** `client`, framework preset **Vite**, output directory `dist`.
2. Set `VITE_API_URL` to the Render backend origin (no trailing path).
3. Redeploy the frontend whenever `VITE_API_URL` changes — Vite embeds it at build time.

For Atlas, create a database user, allow network access from your host, and use the standard Node.js connection string (see the [Atlas connection guide](https://www.mongodb.com/docs/atlas/driver-connection/)). Further references: [Deploy Node/Express on Render](https://render.com/docs/deploy-node-express-app), [Deploy Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Future Improvements

- Resume upload and per-application attachments
- Email reminders for upcoming deadlines and interviews
- Analytics dashboard (application funnel, response rates over time)
- In-app notifications for status changes and stale applications
- Calendar integration for interviews and follow-ups
