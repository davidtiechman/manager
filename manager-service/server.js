const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const fs = require('fs');
const app = express();
const path = require('path');

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
        schedulerMode: 'auto',
        selectedLink: 'lte',
        intervalMs: 15000,
        maxRetries: 3,
        sparkProxyUrl: '',
        token: '',
        batchSize: 10,
        isManualMode: false,
    };
}

function toNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toTimestamp(value, fallback = Date.now()) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value === 'number') {
        return value;
    }

    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? fallback : timestamp;
}

function normalizeStatus(status) {
    if (status === 'online') {
        return 'active';
    }

    if (status === 'active' || status === 'inactive' || status === 'warning' || status === 'offline') {
        return status;
    }

    return 'inactive';
}

function normalizeConfig(agentId, config = {}) {
    const defaults = defaultConfig(agentId);

    return {
        schedulerMode: config.schedulerMode || config.scheduler_mode || defaults.schedulerMode,
        selectedLink: String(config.selectedLink ?? config.selected_link ?? config.scheduler_link ?? defaults.selectedLink),
        intervalMs: toNumber(config.intervalMs ?? config.interval_ms, defaults.intervalMs),
        maxRetries: toNumber(config.maxRetries ?? config.max_retries, defaults.maxRetries),
        sparkProxyUrl: config.sparkProxyUrl ?? config.spark_proxy_url ?? config.base_url ?? defaults.sparkProxyUrl,
        token: config.token ?? defaults.token,
        batchSize: toNumber(config.batchSize ?? config.batch_size, defaults.batchSize),
        isManualMode: Boolean(config.isManualMode ?? config.is_manual_mode ?? defaults.isManualMode),
    };
}

function toAgentResponse(payload, config) {
    const now = Date.now();
    const agentId = String(payload.id || payload.agent_id || payload.agentId || 'unknown-agent');
    const details = payload.status?.details || {};
    const agentData = details.agentData || {};
    const linkQualities = details.linkQualities || {};
    const platform = details.platform || {};
    const normalizedConfig = normalizeConfig(agentId, config || payload.configuration || payload.config);

    return {
        id: agentId,
        lastSeen: toTimestamp(payload.lastSeen, now),
        status: {
            id: String(payload.status?.id || `status-${agentId}`),
            status: normalizeStatus(payload.status?.status || payload.status),
            details: {
                selectedLink: String(details.selectedLink ?? payload.selectedLink ?? payload.selected_link ?? normalizedConfig.selectedLink),
                schedulerMode: String(details.schedulerMode ?? payload.schedulerMode ?? payload.scheduler_mode ?? normalizedConfig.schedulerMode),
                messagesInQueue: toNumber(details.messagesInQueue ?? payload.messagesInQueue ?? payload.messages_in_queue, 0),
                linkQualities: {
                    type: String(linkQualities.type ?? payload.linkType ?? payload.link_type ?? normalizedConfig.selectedLink),
                    available: Boolean(linkQualities.available ?? payload.linkAvailable ?? payload.link_available),
                    quality: String(linkQualities.quality ?? payload.linkQuality ?? payload.link_quality ?? '0'),
                    latency: toNumber(linkQualities.latency ?? payload.latency, 0),
                    reliability: toNumber(linkQualities.reliability ?? payload.reliability, 0),
                    timestamp: toTimestamp(linkQualities.timestamp ?? payload.linkTimestamp ?? payload.link_timestamp, now),
                },
                nextDeliveryTime: String(details.nextDeliveryTime ?? payload.nextDeliveryTime ?? payload.next_delivery_time ?? new Date(now).toISOString()),
                serverLut: String(details.serverLut ?? payload.serverLut ?? payload.server_lut ?? new Date(now).toISOString()),
                agentData: {
                    id: String(agentData.id ?? payload.agentDataId ?? payload.created_id ?? agentId),
                    unit: String(agentData.unit ?? payload.unit ?? ''),
                    unit_code: String(agentData.unit_code ?? payload.unit_code ?? ''),
                    zayad_id: toNumber(agentData.zayad_id ?? payload.zayad_id, 0),
                    call_sign: String(agentData.call_sign ?? payload.call_sign ?? ''),
                },
                platform: {
                    id: toNumber(platform.id ?? payload.platformId ?? payload.platform_id, 0),
                    platform: String(platform.platform ?? payload.platformName ?? payload.platform ?? ''),
                },
            },
        },
        configuration: normalizedConfig,
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
    return Promise.all(
        values
            .filter(Boolean)
            .map(async (value) => {
                const payload = JSON.parse(value);
                const agentId = String(payload.id || payload.agent_id || payload.agentId || 'unknown-agent');
                const config = await getAgentConfig(agentId);
                return toAgentResponse(payload, config);
            })
    );
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
    const nextConfig = normalizeConfig(agentId, config);

    await redis.set(agentConfigKey(agentId), JSON.stringify(nextConfig));
    return nextConfig;
}

async function updateAgentStatusConfig(agentId, config) {
    const value = await redis.get(agentStatusKey(agentId));
    if (!value) {
        return;
    }

    const agent = toAgentResponse(JSON.parse(value), config);
    await saveAgentSync(agent);
}

async function updateAgentConfig(req, res) {
    try {
        const config = await saveAgentConfig(req.params.id, req.body || {});
        await updateAgentStatusConfig(req.params.id, config);
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

    try {
        const config = await getAgentConfig(payload.id);
        const agent = toAgentResponse(payload, config);
        await saveAgentSync(agent);
        await redis.lPush(agentHistoryKey(payload.id), JSON.stringify(createHistoryPoint()));
        await redis.lTrim(agentHistoryKey(payload.id), 0, 49);
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
        app.listen(port, () => {
            console.log(`Manager service listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
}

startServer();
