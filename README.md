# Agent Manager Platform

This repository contains the Docker Compose workspace for the agent manager platform.

## Projects

- `manager-service` - Express backend on `http://localhost:9000`. It receives agent sync requests, stores the latest agent state, history, and configuration in Redis, and exposes API endpoints for the UI.
- `manager-ui` - React Vite UI on `http://localhost:5173`. It displays the agents returned by the manager service.
- `agent-service` - Simulated agent service. In Docker it runs as a single process and periodically sends sync payloads for random agents unless `FIXED_AGENT_ID` is set.

## Runtime Services

- `manager`
- `redis`
- `ui`
- `agent`

## Run All Services

From the repository root:

```bash
docker compose up --build
```

Open the UI:

```text
http://localhost:5173
```

## API Flow

- Agents send sync payloads to `POST /api/agents/sync` and receive their configuration in the response.
- The UI reads agent status from `GET /api/ui/agents`.
- The UI reads agent history from `GET /api/ui/agents/:id/history`.
- The UI reads and updates agent configuration through `/api/ui/agents/:id/config`.
- Redis stores the manager state.

## Run Projects Without Docker

Run the services in separate terminals.

Manager:

```bash
cd manager-service
npm install
npm start
```

UI:

```bash
cd manager-ui
npm install
npm run dev
```

Agent:

```bash
cd agent-service
npm install
npm start
```

For local non-Docker runs, Redis must be available at `redis://localhost:6379`, or set `REDIS_URL` for the manager.

## Stop

```bash
docker compose down
```
