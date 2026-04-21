# Agent Service

Simulated agent process. It sends its status payload to the manager with `POST /api/agents/sync` and receives its configuration in the response.

## Run Without Docker

```bash
npm install
npm start
```

Optional environment variables:

```bash
MANAGER_URL=http://localhost:9000
AGENT_ID=agent-001
SYNC_INTERVAL_MS=15000
```

The manager service must be running before the agent can sync successfully.
