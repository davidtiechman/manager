const managerUrl = process.env.MANAGER_URL || 'http://manager:9000';
const agentId = process.env.AGENT_ID || 'agent-001';
const callSign = process.env.CALL_SIGN || `CALL-${agentId}`;
const unit = process.env.UNIT || 'פיקוד מרכז';
const unitCode = process.env.UNIT_CODE || agentId.toUpperCase();
const zayadId = process.env.ZAYAD_ID || `Z-${agentId.slice(-3)}`;
const platformId = process.env.PLATFORM_ID || `plat-${agentId.slice(-3)}`;
const platformName = process.env.PLATFORM_NAME || `Platform ${agentId.slice(-3)}`;

const statuses = ['online', 'warning', 'offline'];
const linkTypes = ['satcom', 'lte', 'rf'];
const schedulerModes = ['auto', 'manual'];
let currentConfig = {
    schedulerMode: 'auto',
    selectedLink: 'satcom',
    intervalMs: Number(process.env.SYNC_INTERVAL_MS || '15000'),
    maxRetries: 3,
    sparkProxyUrl: '',
    token: '',
    batchSize: 10,
    isManualMode: false,
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Number((Math.random() * (max - min) + min).toFixed(2));
}

function getStatus() {
    return statuses[randomInt(0, statuses.length - 1)];
}

function createPayload() {
    const now = new Date();
    const configuredLink = linkTypes.includes(currentConfig.selectedLink)
        ? currentConfig.selectedLink
        : null;
    const linkType = configuredLink || linkTypes[randomInt(0, linkTypes.length - 1)];
    const status = getStatus();
    const linkAvailable = status !== 'offline';

    return {
        id: agentId,
        status,
        selectedLink: currentConfig.selectedLink || linkType,
        unit,
        unit_code: unitCode,
        zayad_id: zayadId,
        call_sign: callSign,
        platformId,
        platformName,
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
        schedulerMode: currentConfig.schedulerMode || schedulerModes[randomInt(0, schedulerModes.length - 1)],
        config: currentConfig,
    };
}

async function sendSync() {
    const payload = createPayload();

    try {
        const response = await fetch(`${managerUrl}/api/agents/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Agent ${agentId} failed to sync:`, response.statusText);
            return;
        }

        const result = await response.json();
        if (result.config) {
            currentConfig = {
                ...currentConfig,
                ...result.config,
            };
        }
        console.log(`Agent ${agentId} synced`, result);
    } catch (error) {
        console.error(`Agent ${agentId} error sending sync:`, error);
    }
}

async function runLoop() {
    await sendSync();
    setTimeout(runLoop, Number(currentConfig.intervalMs || 15000));
}

console.log(`Agent ${agentId} starting. Manager: ${managerUrl}. Sync interval: ${currentConfig.intervalMs}ms`);
runLoop();
