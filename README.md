# Resume Maker

A full-stack resume builder. Users create a profile, fill in their details, pick a template, and get a live resume with a **rating out of 100**, **tips for the weakest sections**, and a **keyword match** against any job description.

## Features

- **Accounts:** sign up, log in, log out, delete account. Passwords are hashed with bcrypt and sessions use JWT (7 days).
- **Resume types:** Fresher / student, Experienced professional, Technical / IT. The type changes section order and headings.
- **Templates:** Classic, Modern (sidebar), Minimal, Bold header, plus an accent colour picker.
- **Complete sections:** contact, summary, skills, experience, education (with CGPA), projects, certifications, achievements, languages, interests.
- **Rating and tips:** score out of 100 with a per-section breakdown and the next improvement to make.
- **Job match:** paste a job description to see a keyword match percentage and the keywords you are missing.
- **Autosave** to the server, **Download PDF** from the browser's print dialog.

## Tech stack

Node.js, Express, SQLite (built-in `node:sqlite`, no native build needed), bcryptjs, jsonwebtoken, plain HTML/CSS/JavaScript frontend.

## Getting started

Requires **Node.js 22.5 or newer**.

```bash
git clone https://github.com/geethachandana0310-star/resume-maker.git
cd resume-maker
npm install
npm start
```

Open http://localhost:3000.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `JWT_SECRET` | random, saved in `.secret` | Secret used to sign login tokens. Set your own in production. |

## Project structure

```
resume-maker/
├── server.js        Express API + SQLite database
├── package.json
└── public/
    └── index.html   Frontend (form, templates, rating, tips)
```

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/signup` | no | Create account, returns token |
| POST | `/api/login` | no | Log in, returns token |
| GET | `/api/me` | yes | Current user and saved resume |
| PUT | `/api/resume` | yes | Save resume data |
| DELETE | `/api/account` | yes | Delete account and resume |

Send the token as `Authorization: Bearer <token>`.

## Security notes

Login and signup are rate limited, inputs are validated, and `resume.db`, `.secret` and `.env` are git-ignored. For a public deployment, serve over HTTPS and set `JWT_SECRET` yourself.

## Roadmap

- Multiple resumes per user
- Photo upload
- More templates and languages
- Password reset by email

## License

MIT
