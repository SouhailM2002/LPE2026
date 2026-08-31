# MERN CSV Dashboard

This project contains a separate frontend and backend. The dashboard lets you upload a CSV file and view KPI indicators generated from the data.

## Project structure

- `frontend/` – React + Vite dashboard UI
- `backend/` – Express API for CSV parsing and summary generation
- `sample-data.csv` – sample dataset you can upload to test the dashboard

## Start the backend

```bash
cd backend
npm install
npm start
```

## Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Upload flow

1. Open the dashboard.
2. Select a CSV file.
3. Click “Upload and analyze”.
4. The app shows metrics such as rows, total sum, average, maximum, minimum, and blank cells.

## MongoDB

The backend is configured to use MongoDB if it is available at:

```env
MONGO_URI=mongodb://127.0.0.1:27017/mern-dashboard
```

If MongoDB is not running, the app automatically falls back to in-memory storage so the dashboard still works locally.
