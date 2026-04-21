# Manager Service

Express backend for agent sync, agent configuration, and UI APIs.

## Run Without Docker

Start Redis locally first, then run:

```bash
npm install
npm start
```

Optional environment variables:

```bash
PORT=9000
REDIS_URL=redis://localhost:6379
```

## Main Endpoints

- `POST /api/agents/sync` receives an agent status payload and returns that agent's configuration.
- `GET /api/ui/agents` returns the latest agent statuses.
- `GET /api/ui/agents/:id/history` returns agent history.
- `GET /api/ui/agents/:id/config` reads configuration for the UI.
- `PUT /api/ui/agents/:id/config` updates configuration from the UI.
