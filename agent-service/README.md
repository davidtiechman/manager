# Agent Service

Simulated agent process. It sends its status payload to the manager with `POST /api/agents/sync` and receives its configuration in the response.

## Run Without Docker

```bash
npm install
npm start
```

The agent loads environment variables from the repository root `.env` file.
You can also create `agent-service/.env` to override agent-specific values locally.

Optional environment variables:

```bash
MANAGER_URL=http://localhost:9000
SYNC_INTERVAL_MS=15000
FIXED_AGENT_ID=agent-001
```

By default, each sync is sent as a random agent from `agent-001` to `agent-100`.
Set `FIXED_AGENT_ID` only when you want the service to behave as one specific agent.

The manager service must be running before the agent can sync successfully.
