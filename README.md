# LikeAPro

A full-stack fitness coaching platform that connects clients with personal trainers. Trainers build per-client workout plans; clients track sessions, rate completed trainings exercise-by-exercise, chat with their trainer, and rate the trainer's overall service.

---

## Tech stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React 18 (Create React App), React Router, Axios |
| Backend     | Django 4.2, Django REST Framework, SimpleJWT |
| Database    | PostgreSQL 15 |
| Auth        | JWT (access + refresh tokens) |
| Email (dev) | MailHog (SMTP capture for password reset) |
| Tooling     | Docker Compose for local dev |

---

## Features

### Three roles

- **Admin** — manages trainers (approve / reject / remove), users, equipment & accessory catalog, training goals, and views reports.
- **Trainer** — defines a personal exercise library, builds training programs for individual clients, accepts/rejects coaching requests, sees client reviews and trainer rating.
- **Client** — browses trainers, sends coaching requests, fills a fitness profile (gender, height, weight, goals, location, accessories at home), receives trainings, marks them as completed, rates each exercise + the overall session, and rates the trainer.

### Core flows

- Registration with role selection (client or trainer); trainers are pending until an admin approves.
- Onboarding: a new client is auto-redirected to the profile page until required fields are filled.
- Coaching request lifecycle (PENDING → ACCEPTED / REJECTED). Acceptance assigns the trainer to the client.
- Training creation by trainer with multiple exercises (sets, reps, duration).
- Training completion by client with `completed_at` timestamp, per-exercise rating + comment, overall rating + feedback.
- Trainer review by client (1–5 + comment) — automatically recomputes `TrainerProfile.average_rating`.
- Real-time-ish chat (4-second polling) between a client and their assigned trainer.
- Password reset via 6-digit code emailed through MailHog.

---

## Architecture

```
┌────────────────┐     HTTP + JWT      ┌────────────────┐
│  React (3030)  │ ───────────────────▶│  Django (8000) │
│   /api/axios   │                     │   DRF + Simple │
│  AuthContext   │◀────── JSON ────────│   JWT          │
└────────────────┘                     └───────┬────────┘
                                               │ ORM
                                               ▼
                                       ┌───────────────┐
                                       │  Postgres 15  │
                                       └───────────────┘
```

- The frontend talks to the backend through one shared axios instance: `frontend/src/api/axios.js`. It sets `baseURL=http://localhost:8000/api` and attaches the JWT from `localStorage` on every request.
- The backend's database connection lives in `backend/fitness_backend/settings.py` (`DATABASES` block, host `db`).
- CORS is opened only for `http://localhost:3030` in development.

---


## Running locally

Prerequisites: Docker Desktop with Docker Compose v2.

```bash
git clone https://github.com/anjaobradovic/trainLikeAPro.git
cd trainLikeAPro
docker compose up -d --build
```

Services that come up:

| Service   | URL                            | Purpose                  |
|-----------|--------------------------------|--------------------------|
| frontend  | http://localhost:3030          | React app                |
| backend   | http://localhost:8000          | Django + DRF             |
| db        | localhost:5432                 | Postgres (`fitness_db`)  |
| mailhog   | http://localhost:8025          | SMTP web UI (dev emails) |

Apply migrations and create an admin:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Open the React app at `http://localhost:3030` and register a client or trainer — or sign in with the superuser at `/admin` for catalog/admin views.





