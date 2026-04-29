const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const fs = require('fs');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(path.resolve(__dirname, '..', '.env'));
loadEnvFile(path.resolve(__dirname, '.env'));

const managerUiUrl = process.env.MANAGER_UI_URL || 'http://localhost:5173';
const io = new Server(server, {
    cors: {
        origin: managerUiUrl,
        methods: ['GET', 'POST', 'PUT'],
    },
});

app.use(cors());
app.use(express.json());

const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (error) => {
    console.error('Redis error:', error);
});

const agentStatusKey = (agentId) => `agents:${agentId}:status`;
const agentHistoryKey = (agentId) => `agents:${agentId}:history`;
const agentConfigKey = (agentId) => `agents:${agentId}:config`;

function defaultConfig(agentId) {
    return {
        agentId,
        schedulerMode: 'auto',
        selectedLink: 'satcom',
        intervalMs: 15000,
        maxRetries: 3,
        sparkProxyUrl: '',
        token: '',
        batchSize: 10,
        isManualMode: false,
        updatedAt: new Date().toISOString(),
    };
}

async function saveAgentSync(agent) {
    await redis.set(agentStatusKey(agent.id), JSON.stringify(agent));
}

async function getAgentConfig(agentId) {
    const value = await redis.get(agentConfigKey(agentId));
    if (value) {
        return JSON.parse(value);
    }

    const config = defaultConfig(agentId);
    await saveAgentConfig(agentId, config);
    return config;
}

async function saveAgentConfig(agentId, config) {
    const nextConfig = {
        ...defaultConfig(agentId),
        ...config,
        agentId,
        intervalMs: Number(config.intervalMs || 15000),
        maxRetries: Number(config.maxRetries || 3),
        batchSize: Number(config.batchSize || 10),
        isManualMode: Boolean(config.isManualMode),
        updatedAt: new Date().toISOString(),
    };

    await redis.set(agentConfigKey(agentId), JSON.stringify(nextConfig));
    return nextConfig;
}

function createHistoryPoint() {
    const now = new Date();
    return {
        time: now.toISOString(),
        latency: Math.round(50 + Math.random() * 250),
        reliability: Number((0.7 + Math.random() * 0.3).toFixed(2)),
    };
}

app.get('/api/ui/agents', async (req, res) => {
    try {
        const keys = await redis.keys('agents:*:status');
        if (keys.length === 0) {
            return res.json([]);
        }

        const values = await redis.mGet(keys);
        const list = values
            .filter(Boolean)
            .map((value) => JSON.parse(value));

        res.json(list);
    } catch (error) {
        console.error('Failed to load agents from Redis:', error);
        res.status(500).json({ error: 'Failed to load agents' });
    }
});

app.get('/api/ui/agents/:id/history', async (req, res) => {
    try {
        const limit = Number(req.query.limit || 20);
        const values = await redis.lRange(agentHistoryKey(req.params.id), 0, limit - 1);
        res.json(values.map((value) => JSON.parse(value)));
    } catch (error) {
        console.error('Failed to load agent history from Redis:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

app.get('/api/ui/agents/:id/config', async (req, res) => {
    try {
        const config = await getAgentConfig(req.params.id);
        res.json(config);
    } catch (error) {
        console.error('Failed to load agent config:', error);
        res.status(500).json({ error: 'Failed to load config' });
    }
});

app.put('/api/ui/agents/:id/config', async (req, res) => {
    try {
        const config = await saveAgentConfig(req.params.id, req.body || {});
        res.json(config);
    } catch (error) {
        console.error('Failed to save agent config:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

app.get('/api/agents/:id/config', async (req, res) => {
    try {
        const config = await getAgentConfig(req.params.id);
        res.json(config);
    } catch (error) {
        console.error('Failed to send agent config:', error);
        res.status(500).json({ error: 'Failed to load config' });
    }
});

app.post('/api/agents/sync', async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.id) {
        return res.status(400).json({ error: 'Missing agent id' });
    }

    const now = new Date().toISOString();
    const agent = {
        ...payload,
        lastSeen: now,
        serverLut: payload.serverLut || now,
        nextDeliveryTime: payload.nextDeliveryTime || now,
        linkTimestamp: payload.linkTimestamp || now,
    };

    try {
        await saveAgentSync(agent);
        await redis.lPush(agentHistoryKey(payload.id), JSON.stringify(createHistoryPoint()));
        await redis.lTrim(agentHistoryKey(payload.id), 0, 49);
        const config = await getAgentConfig(payload.id);
        const keys = await redis.keys('agents:*:status');
        const values = await redis.mGet(keys);
        const agents = values
            .filter(Boolean)
            .map((value) => JSON.parse(value));

        io.emit('agents:snapshot', agents);
        res.json({ ok: true, config });
    } catch (error) {
        console.error('Failed to save agent sync:', error);
        res.status(500).json({ error: 'Failed to save sync' });
    }
});

app.get('/health', (req, res) => res.send('ok'));

const port = process.env.MANAGER_PORT || 9000;
async function startServer() {
    try {
        await redis.connect();
        server.listen(port, () => {
            console.log(`Manager service listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
}

startServer();
