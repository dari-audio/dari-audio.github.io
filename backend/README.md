# Dari Classroom backend

This directory is the source of truth for a **new, version-controlled backend**. It is not yet connected to the live website or deployed to Yandex Cloud.

## Current infrastructure

- Yandex Cloud Function: `dari-classroom-api` (`d4epunm1gp6qnf1amcbe`)
- API Gateway: `dari-classroom-gateway` (`d5dc5ar7k7tn880jseag`)
- YDB database: `/ru-central1/b1gk4o9ko4js9jlc4t28/etnu9lmt6ejfaja4oaio`
- YDB endpoint: `grpcs://ydb.serverless.yandexcloud.net:2135`
- Frontend origin: `https://dari-audio.github.io`

The existence of these resources does not mean the site is integrated. Treat the live gateway routes and function implementation as unverified until inspected against the deployed configuration. Do not edit the existing function draft as a substitute for its immutable deployed source.

## Intended API surface

All routes below are a **proposed contract**, not a claim that they currently exist.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness check; no secrets or database details |
| POST | `/auth/student/login` | Verify student credentials and issue a session |
| POST | `/auth/teacher/login` | Verify teacher credentials and issue a session |
| POST | `/auth/logout` | Revoke the caller's session |
| GET | `/auth/me` | Return the authenticated account's safe profile |
| POST | `/auth/password` | Change the authenticated account password |
| GET | `/student/classes` | List classes joined by the student |
| POST | `/student/classes/join` | Join a class using a join code |
| GET | `/student/assignments` | List active assignments for the student |
| POST | `/student/progress` | Save/merge exercise progress |
| GET | `/student/progress` | Read the student's progress |
| GET | `/teacher/classes` | List classes owned by the teacher |
| POST | `/teacher/classes` | Create a class |
| GET | `/teacher/classes/{class_id}/students` | List class members and safe progress summaries |
| POST | `/teacher/assignments` | Create an assignment for an owned class |
| GET | `/teacher/assignments` | List assignments for owned classes |
| GET | `/teacher/submissions` | Read submissions for owned classes |

Every teacher route must enforce ownership of the requested class. A valid session alone is not sufficient authorization.

## Security requirements

- Passwords are verified server-side using a modern password hash (prefer Argon2id; otherwise scrypt/PBKDF2 with explicit parameters and per-user salt).
- Issue cryptographically random opaque session tokens. Store only a cryptographic hash of each token in YDB.
- Enforce expiration and server-side revocation. Student and teacher roles must not be interchangeable.
- Never return password hashes, raw session tokens from database records, IAM credentials, or environment variables.
- Never log passwords, authorization headers, or raw session tokens.
- Restrict CORS to the production site origin and the explicitly approved local development origin, if needed. CORS is not authentication.
- Validate input sizes/types and return consistent JSON errors without stack traces.
- Use parameterized YDB queries. Do not interpolate user input into SQL.
- Preserve existing student, teacher, class, assignment, progress, and submission records. No destructive migrations.

## Existing YDB tables

Known tables include `students`, `teachers`, `student_sessions`, `teacher_sessions`, `classes`, `class_members`, `assignments`, `progress`, and `submissions`.

The exact schema for **every** table (including nullable fields, primary keys, and indexes) must be confirmed from YDB before implementing queries or migrations. Existing schemas must be adapted to; do not silently assume a schema or rename columns.

## Integration and release sequence

1. Record the live YDB schema and deployed API Gateway OpenAPI document.
2. Implement the handler and tests in this directory.
3. Test against a separate test database or isolated test records first.
4. Configure API Gateway routes and CORS to match the tested handler.
5. Deploy a new Cloud Function version from this repository source; do not overwrite or rely on the console's editable draft.
6. Test health, both login roles, expiry, logout/revocation, authorization boundaries, class operations, and progress sync.
7. Only then connect the website login and progress UI to the API.
8. Keep the production database unchanged until backups and an explicit migration plan exist.

## Frontend integration still required

The website currently has a login section, but that UI is not proof of a working backend connection. The frontend must be updated only after the deployed API contract is tested. Progress currently needs a safe local-to-server migration so existing browser progress is not lost.
