# Manager UI

React + Vite frontend for the agent manager.

## Run Without Docker

```bash
npm install
npm run dev
```

The UI reads the manager API from `VITE_API_URL`. For local development:

```bash
cp .env.example .env
```

Then open:

```text
http://localhost:5173
```

The manager service should be running at `http://localhost:9000`.
