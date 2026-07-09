# CareerPilot MVP

CareerPilot is a single-user MERN job application tracker. It supports the complete MVP flow: add an application, see pipeline counts, change its status, and delete it.

## Project structure

```text
careerpilot/
├── client/        # React + Vite frontend
├── server/        # Express + Mongoose API
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB database, either local or on MongoDB Atlas

## Run locally

Open two terminals at the project root.

### 1. Configure and start the backend

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env`:

```powershell
Copy-Item .env.example .env
```

```env
MONGODB_URI=mongodb://127.0.0.1:27017/careerpilot
PORT=5000
```

If you use Atlas locally, replace `MONGODB_URI` with your Atlas connection string.

Start the API:

```bash
npm run dev
```

The terminal should show `Connected to MongoDB` and `CareerPilot API listening on port 5000`. You can open `http://localhost:5000` to confirm the API is running.

### 2. Configure and start the frontend

In the second terminal:

```bash
cd client
npm install
```

Copy `client/.env.example` to `client/.env`:

```powershell
Copy-Item .env.example .env
```

```env
VITE_API_URL=http://localhost:5000
```

Start Vite:

```bash
npm run dev
```

Open the local URL Vite prints, normally `http://localhost:5173`.

## Test the full local flow

Keep both terminals running, then:

1. **Add:** Complete at least the required Company and Role fields, optionally add the other details, and select **Add application**. The new card should appear first, Total and Applied should each increase by one, and the record should persist after a page refresh.
2. **Change status:** Change that card's status from Applied to Interview. The card dropdown should update immediately, Applied should decrease by one, Interview should increase by one, and the status should remain Interview after a page refresh.
3. **Delete:** Select **Delete** on the card. The card should disappear and the Total and Interview counts should each decrease by one. Refresh once more to confirm it stays deleted.

If the UI reports a connection error, confirm the API terminal is still running and that `VITE_API_URL` exactly matches the backend origin. If the API cannot connect, verify the MongoDB URI and Atlas network access settings.

## Deploy

The deployment layout is:

- MongoDB Atlas hosts the database.
- Render hosts the Express backend.
- Vercel hosts the Vite frontend.

### 1. Create the MongoDB Atlas database

1. Create or sign in to a MongoDB Atlas account and create a project.
2. Create an M0/free cluster if available in your region.
3. In **Database Access**, create a database user with a strong username and password.
4. In **Network Access**, add `0.0.0.0/0` so Render can connect from its dynamic outbound IPs. For a production app, replace this with tighter access when your hosting setup supports it.
5. Open the cluster's **Connect → Drivers** screen and copy the Node.js connection string.
6. Replace the username, password, and database name. The final value should resemble:

   ```text
   mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/careerpilot?retryWrites=true&w=majority
   ```

   URL-encode special characters in the username or password.

### 2. Deploy the backend to Render

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, select **New → Web Service** and connect the repository.
3. Configure the service:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add this environment variable in Render:
   - `MONGODB_URI` = the complete Atlas connection string from the previous section
5. You do not need to set `PORT`; Render supplies it automatically. The code uses it through `process.env.PORT`.
6. Deploy and wait for the logs to show the MongoDB connection and listening messages.
7. Open the assigned Render URL. You should see:

   ```json
   { "message": "CareerPilot API is running" }
   ```

Copy the backend origin, for example `https://careerpilot-api.onrender.com`, with no trailing `/api` path.

### 3. Deploy the frontend to Vercel

1. In Vercel, select **Add New → Project** and import the same repository.
2. Configure the project:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add this environment variable to the Production environment:
   - `VITE_API_URL` = the Render backend origin, for example `https://careerpilot-api.onrender.com`
4. Deploy. Vercel will provide the public frontend URL.
5. Open the Vercel URL and repeat the add → change status → delete test above.

If `VITE_API_URL` is changed after a deployment, redeploy the frontend because Vite embeds this value at build time. The API intentionally allows all CORS origins for this MVP.

Official deployment references:

- [Connect an application to MongoDB Atlas](https://www.mongodb.com/docs/atlas/driver-connection/)
- [Deploy a Node/Express app on Render](https://render.com/docs/deploy-node-express-app)
- [Configure a monorepo root directory on Vercel](https://vercel.com/docs/monorepos)
- [Deploy Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/applications` | List newest applications first |
| POST | `/api/applications` | Create an application |
| PATCH | `/api/applications/:id` | Update any supplied fields |
| DELETE | `/api/applications/:id` | Delete an application |
