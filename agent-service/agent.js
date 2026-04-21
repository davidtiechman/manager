const fs = require('fs');
const path = require('path');

const originalEnvKeys = new Set(Object.keys(process.env));

function loadEnvFile(filePath, { override = false } = {}) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if (!key || originalEnvKeys.has(key) || (!override && process.env[key] !== undefined)) {
            continue;
        }

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
}

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '.env'), { override: true });

const managerUrl = process.env.MANAGER_URL || 'http://manager:9000';
const fixedAgentId = process.env.FIXED_AGENT_ID || '';
const unit = process.env.UNIT || 'פיקוד מרכז';

const statuses = ['online', 'warning', 'offline'];
const linkTypes = ['satcom', 'lte', 'rf'];
const schedulerModes = ['auto', 'manual'];
const defaultIntervalMs = Number(process.env.SYNC_INTERVAL_MS || '15000');
const defaultConfig = {
    schedulerMode: 'auto',
    selectedLink: 'satcom',
    intervalMs: defaultIntervalMs,
    maxRetries: 3,
    sparkProxyUrl: '',
    token: '',
    batchSize: 10,
    isManualMode: false,
};
const configByAgentId = new Map();

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

function getStatus() {
    return statuses[randomInt(0, statuses.length - 1)];
}

function createAgentIdentity() {
    const agentNumber = fixedAgentId
        ? Number(fixedAgentId.match(/\d+/)?.[0] || '1')
        : randomInt(1, 100);
    const paddedNumber = String(agentNumber).padStart(3, '0');
    const agentId = fixedAgentId || `agent-${paddedNumber}`;

    return {
        agentId,
        callSign: fixedAgentId && process.env.CALL_SIGN ? process.env.CALL_SIGN : `CALL-${paddedNumber}`,
        unitCode: fixedAgentId && process.env.UNIT_CODE ? process.env.UNIT_CODE : `AGENT-${paddedNumber}`,
        zayadId: fixedAgentId && process.env.ZAYAD_ID ? process.env.ZAYAD_ID : `Z-${paddedNumber}`,
        platformId: fixedAgentId && process.env.PLATFORM_ID ? process.env.PLATFORM_ID : `plat-${paddedNumber}`,
        platformName: fixedAgentId && process.env.PLATFORM_NAME ? process.env.PLATFORM_NAME : `Platform ${paddedNumber}`,
    };
}

function createPayload() {
    const now = new Date();
    const identity = createAgentIdentity();
    const agentConfig = configByAgentId.get(identity.agentId) || defaultConfig;
    const configuredLink = linkTypes.includes(agentConfig.selectedLink)
        ? agentConfig.selectedLink
        : null;
    const linkType = configuredLink || linkTypes[randomInt(0, linkTypes.length - 1)];
    const status = getStatus();
    const linkAvailable = status !== 'offline';

    return {
        id: identity.agentId,
        status,
        selectedLink: agentConfig.selectedLink || linkType,
        unit,
        unit_code: identity.unitCode,
        zayad_id: identity.zayadId,
        call_sign: identity.callSign,
        platformId: identity.platformId,
        platformName: identity.platformName,
        messagesInQueue: randomInt(0, 30),
        linkType,
        linkAvailable,
        linkQuality: randomFloat(0.5, 1.0),
        latency: randomInt(40, 420),
        reliability: randomFloat(0.5, 1.0),
        linkTimestamp: now.toISOString(),
        lastSeen: now.toISOString(),
        nextDeliveryTime: new Date(now.getTime() + randomInt(5000, 20000)).toISOString(),
        serverLut: now.toISOString(),
        schedulerMode: agentConfig.schedulerMode || schedulerModes[randomInt(0, schedulerModes.length - 1)],
        config: agentConfig,
    };
}

async function sendSync() {
    const payload = createPayload();
    console.log(`Agent ${payload.id} sending sync`);

    try {
        const response = await fetch(`${managerUrl}/api/agents/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Agent ${payload.id} failed to sync:`, response.statusText);
            return;
        }

        const result = await response.json();
        if (result.config) {
            configByAgentId.set(payload.id, {
                ...defaultConfig,
                ...result.config,
            });
        }
        console.log(`Agent ${payload.id} synced`, result);
    } catch (error) {
        console.error(`Agent ${payload.id} error sending sync:`, error);
    }
}

async function runLoop() {
    await sendSync();
    setTimeout(runLoop, defaultIntervalMs);
}

console.log(`Agent service starting. Manager: ${managerUrl}. Sync interval: ${defaultIntervalMs}ms`);
runLoop();
