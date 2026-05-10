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
const allowedOrigins = managerUiUrl.split(',').map((origin) => origin.trim()).filter(Boolean);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT'],
    },
});

app.use(cors({ origin: allowedOrigins }));
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
        agent_id: agentId,
        scheduler_mode: 'auto',
        selected_link: 1,
        interval_ms: 15000,
        max_retries: 3,
        spark_proxy_url: '',
        token: '',
        batch_size: 10,
        is_manual_mode: false,
        created_at: new Date().toISOString(),
    };
}

async function saveAgentSync(agent) {
    await redis.set(agentStatusKey(agent.id), JSON.stringify(agent));
}

async function loadAgents() {
    const keys = await redis.keys('agents:*:status');
    if (keys.length === 0) {
        return [];
    }

    const values = await redis.mGet(keys);
    return values
        .filter(Boolean)
        .map((value) => {
            const agent = JSON.parse(value);
            return {
                ...agent,
                agent_id: agent.agent_id || agent.id,
                scheduler_mode: agent.scheduler_mode || agent.schedulerMode,
                selected_link: Number(agent.selected_link ?? agent.scheduler_link ?? 0),
                messages_in_queue: Number(agent.messages_in_queue ?? agent.messagesInQueue ?? 0),
                platform_id: agent.platform_id || agent.platformId,
                platform: agent.platform || agent.platformName,
            };
        });
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
        agent_id: agentId,
        scheduler_mode: config.scheduler_mode || config.schedulerMode || 'auto',
        selected_link: Number(config.selected_link ?? config.scheduler_link ?? 1),
        interval_ms: Number(config.interval_ms ?? config.intervalMs ?? 15000),
        max_retries: Number(config.max_retries ?? config.maxRetries ?? 3),
        spark_proxy_url: config.spark_proxy_url ?? config.sparkProxyUrl ?? '',
        batch_size: Number(config.batch_size ?? config.batchSize ?? 10),
        is_manual_mode: Boolean(config.is_manual_mode ?? config.isManualMode),
        created_at: config.created_at || new Date().toISOString(),
    };

    await redis.set(agentConfigKey(agentId), JSON.stringify(nextConfig));
    return nextConfig;
}

async function updateAgentConfig(req, res) {
    try {
        const config = await saveAgentConfig(req.params.id, req.body || {});
        res.json(config);
    } catch (error) {
        console.error('Failed to save agent config:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
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
        res.json(await loadAgents());
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

app.put('/api/ui/agents/:id/config', updateAgentConfig);

app.get('/api/agents/:id/config', async (req, res) => {
    try {
        const config = await getAgentConfig(req.params.id);
        res.json(config);
    } catch (error) {
        console.error('Failed to send agent config:', error);
        res.status(500).json({ error: 'Failed to load config' });
    }
});

app.put('/api/agents/:id/config', updateAgentConfig);

app.post('/api/agents/sync', async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.id) {
        return res.status(400).json({ error: 'Missing agent id' });
    }

    const now = new Date().toISOString();
    const agent = {
        ...payload,
        agent_id: payload.agent_id || payload.id,
        scheduler_mode: payload.scheduler_mode || payload.schedulerMode,
        selected_link: Number(payload.selected_link ?? payload.scheduler_link ?? 0),
        messages_in_queue: Number(payload.messages_in_queue ?? payload.messagesInQueue ?? 0),
        platform_id: payload.platform_id || payload.platformId,
        platform: payload.platform || payload.platformName,
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
        io.emit('agents:snapshot', await loadAgents());
        res.json({ ok: true, config });
    } catch (error) {
        console.error('Failed to save agent sync:', error);
        res.status(500).json({ error: 'Failed to save sync' });
    }
});

app.get('/health', (req, res) => res.send('ok'));

io.on('connection', async (socket) => {
    try {
        socket.emit('agents:snapshot', await loadAgents());
    } catch (error) {
        console.error('Failed to send initial agents snapshot:', error);
    }
});

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
