# JWT Authentication — Implementation Summary

## Files Created

| File | Purpose |
|---|---|
| `server/models/User.js` | Mongoose User model (name, email, hashed password). Includes `pre("save")` bcrypt hook and `comparePassword()` instance method. |
| `server/middleware/auth.js` | Express middleware that reads the `Authorization: Bearer <token>` header, verifies the JWT, and sets `req.userId`. Returns friendly 401 errors for missing, invalid, or expired tokens. |
| `server/routes/auth.js` | Three endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Signs 7-day JWTs. Never returns the password hash. |

---

## Files Modified

| File | Change |
|---|---|
| `server/models/Application.js` | Added `userId` field (required `ObjectId` ref to `User`, indexed). Existing fields unchanged. |
| `server/routes/applications.js` | Added `router.use(authenticate)` — all CRUD is now gated. Every DB query includes `userId: req.userId` filter, preventing cross-user data access. |
| `server/server.js` | Imported and mounted `authRoutes` at `/api/auth`. Added startup check for `JWT_SECRET`. |
| `server/.env` | Added `JWT_SECRET` entry (placeholder value — **must change before deploying**). |
| `client/src/api.js` | Request interceptor auto-attaches `Authorization: Bearer <token>` from `localStorage`. Response interceptor clears stale token and redirects to `#/login` on 401. |
| `client/src/App.jsx` | Added `LoginPage`, `RegisterPage`, and a hash-based router. Original dashboard is now in a `Dashboard` component, unchanged. Logout clears `localStorage` and navigates to login. |
| `client/src/styles.css` | Appended `.auth-shell`, `.auth-card`, `.auth-form`, `.auth-submit`, `.auth-switch`, `.header-right`, `.user-menu`, `.user-name`, `.logout-button` — no existing rules touched. |

---

## New npm Packages

None — `jsonwebtoken` and `bcryptjs` were already listed as dependencies in `server/package.json`.

---

## Required Environment Variables

### Server (`server/.env` / Render)

| Variable | Description |
|---|---|
| `MONGODB_URI` | Already set |
| `PORT` | Already set |
| `JWT_SECRET` | **New** — Long, random, unpredictable string. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

### Client (`client/.env` / Vercel)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Already set — no changes needed |

> [!CAUTION]
> Replace `JWT_SECRET=change_this_to_a_long_random_secret_before_deploying` in `server/.env` with a real secret before deploying. Commit `.env` to `.gitignore` (it already is).

---

## Manual Testing Checklist

### Registration
- [ ] Visit `http://localhost:5173` — should redirect to `#/login`
- [ ] Click "Create one" — should navigate to `#/register`
- [ ] Submit with missing fields → friendly validation error
- [ ] Submit with a password shorter than 8 chars → "Password must be at least 8 characters"
- [ ] Register with a valid name/email/password → redirected to dashboard
- [ ] Try to register with the same email again → "An account with that email already exists"

### Login
- [ ] Navigate to `#/login`
- [ ] Submit with wrong password → "Invalid email or password"
- [ ] Submit with correct credentials → redirected to dashboard
- [ ] Verify name appears in the top-right user menu

### Dashboard (Protected Route)
- [ ] While logged in, dashboard loads and shows your applications
- [ ] Open a new private/incognito tab and visit `http://localhost:5173` → redirected to `#/login` (no token)
- [ ] Manually delete `cp_token` from localStorage in DevTools → next API call redirects to `#/login`

### CRUD Isolation
- [ ] Register User A, add two applications — note their content
- [ ] Register User B (different email) — dashboard is empty
- [ ] Copy an application `_id` from User A's data and call `PATCH /api/applications/<id>` with User B's token → **404 Application not found**
- [ ] Same for DELETE → **404**

### Logout
- [ ] Click "Sign out" → redirected to `#/login`
- [ ] Browser back button does not return to dashboard (no token)
- [ ] `localStorage` is cleared (`cp_token` and `cp_user` both absent)

### Token Expiration
- [ ] In `server/routes/auth.js` temporarily change `"7d"` to `"1s"`, log in, wait 2 seconds, attempt any API call → "Session expired, please log in again" in network response, redirect to login
- [ ] Revert after testing

### `/me` Endpoint
- [ ] `GET /api/auth/me` with valid token → returns `{ user: { _id, name, email, createdAt } }`
- [ ] `GET /api/auth/me` with no token → 401 "Authentication required"
- [ ] `GET /api/auth/me` with a tampered token → 401 "Invalid token"
