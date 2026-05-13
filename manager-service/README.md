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
MANAGER_PORT=9000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://manager:manager@localhost:5432/manager_history
```

## Main Endpoints

- `POST /api/agents/sync` receives an agent status payload and returns that agent's configuration.
- `GET /api/ui/agents` returns the latest agent statuses.
- `GET /api/ui/agents/:id/history` returns agent history.
- `GET /api/history/agents` returns agents that have persisted sync history from Postgres.
- `GET /api/history/agents/:id/syncs` returns persisted sync records for one agent from Postgres.
- `GET /api/ui/agents/:id/config` reads configuration for the UI.
- `PUT /api/ui/agents/:id/config` updates configuration from the UI.
- `GET /api/agents/:id/config` returns configuration for an agent.
- `PUT /api/agents/:id/config` updates configuration for an agent.

## Storage

- Redis stores the current realtime agent state and current configuration.
- Postgres stores persistent history in `history_agents` and `agent_syncs`.
