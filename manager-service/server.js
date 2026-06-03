const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { Pool } = require('pg');
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

const historyDb = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://manager:manager@localhost:5432/manager_history',
});

redis.on('error', (error) => {
    console.error('Redis error:', error);
});

const agentStatusKey = (agentId) => `agents:${agentId}:status`;
const agentHistoryKey = (agentId) => `agents:${agentId}:history`;
const agentConfigKey = (agentId) => `agents:${agentId}:config`;

async function initHistoryDb() {
    await historyDb.query(`
        CREATE TABLE IF NOT EXISTS history_agents (
            id TEXT PRIMARY KEY,
            call_sign TEXT,
            unit TEXT,
            unit_code TEXT,
            zayad_id INTEGER,
            platform_id INTEGER,
            platform TEXT,
            first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS agent_syncs (
            id BIGSERIAL PRIMARY KEY,
            agent_id TEXT NOT NULL REFERENCES history_agents(id),
            status TEXT NOT NULL,
            selected_link TEXT,
            scheduler_mode TEXT,
            messages_in_queue INTEGER,
            next_delivery_time TEXT,
            geo_data TEXT,
            server_lut TEXT,
            link_type TEXT,
            link_available BOOLEAN,
            link_quality TEXT,
            latency INTEGER,
            reliability NUMERIC,
            link_timestamp BIGINT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS agent_syncs_agent_created_idx
        ON agent_syncs (agent_id, created_at DESC);
    `);
}

// ── Messages table ──
async function initMessagesDb() {
    await historyDb.query(`
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messages_content_type_enum') THEN
                CREATE TYPE messages_content_type_enum AS ENUM ('Json', 'Excel');
            END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS messages (
            id            TEXT PRIMARY KEY,
            received_at   TIMESTAMPTZ,
            sent_at       TIMESTAMPTZ,
            content       TEXT,
            priority      INTEGER,
            content_json  JSONB,
            content_excel TEXT,
            content_type  messages_content_type_enum,
            processed     BOOLEAN,
            agent_id      TEXT REFERENCES history_agents(id)
        );

        CREATE INDEX IF NOT EXISTS messages_agent_received_idx
        ON messages (agent_id, received_at DESC);
    `);
}

const MESSAGES_PER_AGENT = 100;

// Seed ~100 messages/agent (only when empty).
async function seedMessages() {
    const countRes = await historyDb.query('SELECT count(*)::int AS total FROM messages');
    if (countRes.rows[0].total > 0) return;

    const agentsRes = await historyDb.query('SELECT id FROM history_agents ORDER BY id');
    const agentIds = agentsRes.rows.map((r) => r.id);
    if (agentIds.length === 0) return;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const CONTENTS = [
        'Routine status report', 'Position update', 'Supply request',
        'Mission acknowledgement', 'Sensor telemetry', 'Heartbeat ping',
        'Encrypted payload', 'Command received', 'Link handshake', 'Diagnostics dump',
    ];

    for (const agentId of agentIds) {
        const values = [];
        const tuples = [];
        let p = 0;
        for (let i = 0; i < MESSAGES_PER_AGENT; i += 1) {
            const isJson = i % 2 === 0;
            const contentType = isJson ? 'Json' : 'Excel';
            const processed = i % 10 < 7; // ~70% processed
            const receivedAt = new Date(
                now - ((i * 7) % 30) * dayMs - (i % 24) * 3_600_000 - (i % 60) * 60_000
            ).toISOString();
            const sentAt = processed
                ? new Date(new Date(receivedAt).getTime() + (5 + (i % 30)) * 1000).toISOString()
                : null;
            const priority = 1 + (i % 5);
            const content = `${CONTENTS[i % CONTENTS.length]} #${i + 1}`;
            const contentJson = isJson
                ? JSON.stringify({ seq: i + 1, agent: agentId, payload: content, ok: processed })
                : null;
            const contentExcel = isJson ? null : `col1,col2,col3\n${i + 1},${priority},${processed}`;
            const id = `msg-${agentId}-${String(i + 1).padStart(3, '0')}`;

            tuples.push(
                `($${++p},$${++p},$${++p},$${++p},$${++p},$${++p}::jsonb,$${++p},$${++p}::messages_content_type_enum,$${++p},$${++p})`
            );
            values.push(
                id, receivedAt, sentAt, content, priority,
                contentJson, contentExcel, contentType, processed, agentId
            );
        }
        await historyDb.query(
            `INSERT INTO messages
                (id, received_at, sent_at, content, priority,
                 content_json, content_excel, content_type, processed, agent_id)
             VALUES ${tuples.join(',')}`,
            values
        );
    }
    console.log(`Seeded ${MESSAGES_PER_AGENT} messages for ${agentIds.length} agents`);
}

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

async function saveHistorySync(agent) {
    const details = agent.status.details;
    const agentData = details.agentData;
    const platform = details.platform;
    const linkQuality = details.linkQualities;
    const lastSeen = new Date(agent.lastSeen || Date.now()).toISOString();

    await historyDb.query(
        `
        INSERT INTO history_agents (
            id,
            call_sign,
            unit,
            unit_code,
            zayad_id,
            platform_id,
            platform,
            first_seen_at,
            last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        ON CONFLICT (id) DO UPDATE SET
            call_sign = EXCLUDED.call_sign,
            unit = EXCLUDED.unit,
            unit_code = EXCLUDED.unit_code,
            zayad_id = EXCLUDED.zayad_id,
            platform_id = EXCLUDED.platform_id,
            platform = EXCLUDED.platform,
            last_seen_at = EXCLUDED.last_seen_at
        `,
        [
            agent.id,
            agentData.call_sign,
            agentData.unit,
            agentData.unit_code,
            agentData.zayad_id,
            platform.id,
            platform.platform,
            lastSeen,
        ]
    );

    await historyDb.query(
        `
        INSERT INTO agent_syncs (
            agent_id,
            status,
            selected_link,
            scheduler_mode,
            messages_in_queue,
            next_delivery_time,
            geo_data,
            server_lut,
            link_type,
            link_available,
            link_quality,
            latency,
            reliability,
            link_timestamp,
            created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
        [
            agent.id,
            agent.status.status,
            details.selectedLink,
            details.schedulerMode,
            details.messagesInQueue,
            details.nextDeliveryTime,
            details.geoData ?? null,
            details.serverLut,
            linkQuality.type,
            linkQuality.available,
            linkQuality.quality,
            linkQuality.latency,
            linkQuality.reliability,
            linkQuality.timestamp,
            lastSeen,
        ]
    );
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

async function handleLoadAgents(req, res) {
    try {
        res.json(await loadAgents());
    } catch (error) {
        console.error('Failed to load agents from Redis:', error);
        res.status(500).json({ error: 'Failed to load agents' });
    }
}

async function handleLoadAgentHistory(req, res) {
    try {
        const limit = Number(req.query.limit || 20);
        const values = await redis.lRange(agentHistoryKey(req.params.id), 0, limit - 1);
        res.json(values.map((value) => JSON.parse(value)));
    } catch (error) {
        console.error('Failed to load agent history from Redis:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
}

// Maps a history_agents row to the roster shape.
function toHistoryAgentResponse(row) {
    return {
        id: row.id,
        callsign: row.call_sign,
        createdAt: row.first_seen_at,
        platfrom: {
            id: row.platform_id,
            unit: row.unit,
            unitCode: row.unit_code,
            zayadId: row.zayad_id,
            platform: row.platform,
            platformId: row.platform_id,
            createdAt: row.first_seen_at,
        },
    };
}

async function handleLoadHistoryAgents(req, res) {
    try {
        const result = await historyDb.query(
            `
            SELECT id, call_sign, unit, unit_code, zayad_id, platform, platform_id, first_seen_at
            FROM history_agents
            ORDER BY id
            `
        );
        res.json(result.rows.map(toHistoryAgentResponse));
    } catch (error) {
        console.error('Failed to load history agents:', error);
        res.status(500).json({ error: 'Failed to load history agents' });
    }
}

// Allowed columns for sort/filter — whitelist prevents SQL injection
// Values are prefixed with the agent_syncs alias `s.` because the syncs query
// LEFT JOINs agent_config / platform_data, which share column names
// (created_at, selected_link, scheduler_mode) — unqualified refs are ambiguous.
const SYNCS_SORTABLE_COLUMNS = new Map([
    ['id',                  's.id'],
    ['status',              's.status'],
    ['createdAt',           's.created_at'],
    ['selectedLink',        's.selected_link'],
    ['schedulerMode',       's.scheduler_mode'],
    ['messagesInQueue',     's.messages_in_queue'],
    ['nextDeliveryTime',    's.next_delivery_time'],
    ['geoData',             's.geo_data'],
    ['serverLut',           's.server_lut'],
    ['linkType',            's.link_type'],
    ['linkAvailable',       's.link_available'],
    ['linkQuality',         's.link_quality'],
    ['latency',             's.latency'],
    ['reliability',         's.reliability'],
    ['linkTimestamp',       's.link_timestamp'],
    // Agent Config (joined as ac) — sort/filter on nested config fields
    ['cfgSchedulerMode',    'ac.scheduler_mode'],
    ['cfgSelectedLink',     'ac.selected_link'],
    ['intervalMs',          'ac.interval_ms'],
    ['maxRetries',          'ac.max_retries'],
    ['batchSize',           'ac.batch_size'],
    ['isManualMode',        'ac.is_manual_mode'],
    ['sparkProxyUrl',       'ac.spark_proxy_url'],
    ['token',               'ac.token'],
    ['cfgCreatedAt',        'ac.created_at'],
    // Platform Data (joined as pd)
    ['unit',                'pd.unit'],
    ['unitCode',            'pd.unit_code'],
    ['zayadId',             'pd.zayad_id'],
    ['platform',            'pd.platform'],
    ['platformId',          'pd.platform_id'],
    ['platCreatedAt',       'pd.created_at'],
]);

const SYNCS_BOOLEAN_COLS = new Set(['s.link_available', 'ac.is_manual_mode']);

// ── Generic IRM query builders (shared by all history tables) ──
function buildIrmOrderBy(colMap, sortModel, defaultOrderBy) {
    if (!Array.isArray(sortModel) || sortModel.length === 0) return defaultOrderBy;

    const parts = sortModel
        .filter((s) => colMap.has(s.colId))
        .map((s) => `${colMap.get(s.colId)} ${s.sort === 'asc' ? 'ASC' : 'DESC'}`);

    return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : defaultOrderBy;
}

function buildIrmWhere(colMap, baseConditions, filterModel, params, booleanCols = new Set()) {
    const conditions = [...baseConditions];

    if (!filterModel || typeof filterModel !== 'object') {
        return conditions.join(' AND ');
    }

    for (const [fieldId, filter] of Object.entries(filterModel)) {
        const col = colMap.get(fieldId);
        if (!col || !filter || typeof filter !== 'object') continue;

        const { filterType, type, filter: value, filterTo, dateFrom, dateTo } = filter;
        const isBoolean = filterType === 'boolean' || booleanCols.has(col);

        if (filterType === 'text') {
            if (type === 'equals') {
                params.push(value);
                conditions.push(`${col} = $${params.length}`);
            } else if (type === 'contains') {
                params.push(`%${value}%`);
                conditions.push(`${col} ILIKE $${params.length}`);
            } else if (type === 'startsWith') {
                params.push(`${value}%`);
                conditions.push(`${col} ILIKE $${params.length}`);
            } else if (type === 'endsWith') {
                params.push(`%${value}`);
                conditions.push(`${col} ILIKE $${params.length}`);
            } else if (type === 'notContains') {
                params.push(`%${value}%`);
                conditions.push(`${col} NOT ILIKE $${params.length}`);
            }
        } else if (filterType === 'number') {
            const num = Number(value);
            if (!Number.isFinite(num)) continue;
            if (type === 'equals') {
                params.push(num);
                conditions.push(`${col} = $${params.length}`);
            } else if (type === 'greaterThan') {
                params.push(num);
                conditions.push(`${col} > $${params.length}`);
            } else if (type === 'greaterThanOrEqual') {
                params.push(num);
                conditions.push(`${col} >= $${params.length}`);
            } else if (type === 'lessThan') {
                params.push(num);
                conditions.push(`${col} < $${params.length}`);
            } else if (type === 'lessThanOrEqual') {
                params.push(num);
                conditions.push(`${col} <= $${params.length}`);
            } else if (type === 'inRange') {
                const numTo = Number(filterTo);
                if (Number.isFinite(numTo)) {
                    params.push(num, numTo);
                    conditions.push(`${col} BETWEEN $${params.length - 1} AND $${params.length}`);
                }
            }
        } else if (filterType === 'date') {
            if (dateFrom) {
                params.push(new Date(dateFrom).toISOString());
                conditions.push(`${col} >= $${params.length}`);
            }
            if (dateTo) {
                params.push(new Date(dateTo).toISOString());
                conditions.push(`${col} <= $${params.length}`);
            }
        } else if (isBoolean) {
            params.push(value === 'true' || value === true);
            conditions.push(`${col} = $${params.length}`);
        } else if (filterType === 'set') {
            // empty=none, missing=skip, null=(Blanks)→IS NULL
            if (!Array.isArray(filter.values)) continue;
            if (filter.values.length === 0) {
                conditions.push('FALSE');
                continue;
            }

            const nonNullValues = filter.values.filter(
                (v) => v !== null && v !== undefined
            );
            const includeNulls = nonNullValues.length !== filter.values.length;
            const parts = [];

            if (nonNullValues.length > 0) {
                const placeholders = nonNullValues.map((v) => {
                    if (booleanCols.has(col)) {
                        params.push(v === true || v === 'true');
                    } else {
                        params.push(String(v));
                    }
                    return `$${params.length}`;
                });
                parts.push(`${col} IN (${placeholders.join(', ')})`);
            }

            if (includeNulls) {
                parts.push(`${col} IS NULL`);
            }

            if (parts.length > 0) {
                conditions.push(`(${parts.join(' OR ')})`);
            }
        }
    }

    return conditions.join(' AND ');
}

// ── Generic IRM request runner (each table supplies its SQL) ──
async function runIrmQuery(req, res, opts) {
    const {
        colMap, baseConditions, booleanCols = new Set(),
        defaultOrderBy, mainSql, countSql, errorLabel,
    } = opts;
    try {
        const useIrm = req.query.startRow !== undefined;

        let startRow, blockSize;
        if (useIrm) {
            startRow = Math.max(0, Number(req.query.startRow) || 0);
            const endRow = Math.max(1, Number(req.query.endRow) || 100);
            blockSize = Math.min(endRow - startRow, 500);
        } else {
            const legacyOffset = Math.max(0, Number(req.query.offset) || 0);
            const legacyLimit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
            startRow = legacyOffset;
            blockSize = legacyLimit;
        }

        let sortModel = [];
        let filterModel = {};
        try { sortModel = JSON.parse(req.query.sortModel || '[]'); } catch { sortModel = []; }
        try { filterModel = JSON.parse(req.query.filterModel || '{}'); } catch { filterModel = {}; }

        const params = [req.params.id];
        const whereClause = buildIrmWhere(colMap, baseConditions, filterModel, params, booleanCols);
        const orderBy = buildIrmOrderBy(colMap, sortModel, defaultOrderBy);

        const offsetIdx = params.length + 1;
        const limitIdx = params.length + 2;

        const result = await historyDb.query(
            mainSql(whereClause, orderBy, limitIdx, offsetIdx),
            [...params, startRow, blockSize]
        );
        const rows = result.rows;

        if (useIrm) {
            const lastRow = rows.length < blockSize ? startRow + rows.length : null;
            let rowCount;
            if (startRow === 0) {
                const countRes = await historyDb.query(countSql(whereClause), params);
                rowCount = Number(countRes.rows[0]?.total ?? 0);
            }
            res.json({ rows, lastRow, rowCount });
        } else {
            res.json({ items: rows, total: rows.length });
        }
    } catch (error) {
        console.error(errorLabel, error);
        res.status(500).json({ error: errorLabel });
    }
}

function handleLoadHistoryAgentSyncs(req, res) {
    return runIrmQuery(req, res, {
        colMap: SYNCS_SORTABLE_COLUMNS,
        baseConditions: ['s.agent_id = $1'],
        booleanCols: SYNCS_BOOLEAN_COLS,
        defaultOrderBy: 'ORDER BY s.created_at DESC',
        errorLabel: 'Failed to load agent sync history',
        mainSql: (where, orderBy, limitIdx, offsetIdx) => `
            SELECT
                s.id,
                s.agent_id AS "agentId",
                s.status,
                s.created_at AS "createdAt",
                json_build_object(
                    'id', s.id,
                    'selectedLink',     s.selected_link,
                    'schedulerMode',    s.scheduler_mode,
                    'messagesInQueue',  s.messages_in_queue,
                    'nextDeliveryTime', s.next_delivery_time,
                    'geoData',          s.geo_data,
                    'serverLut',        s.server_lut,
                    'agentConfig', CASE WHEN ac.id IS NULL THEN NULL ELSE json_build_object(
                        'id',            ac.id,
                        'schedulerMode', ac.scheduler_mode,
                        'selectedLink',  ac.selected_link,
                        'intervalMs',    ac.interval_ms,
                        'maxRetries',    ac.max_retries,
                        'sparkProxyUrl', ac.spark_proxy_url,
                        'token',         ac.token,
                        'batchSize',     ac.batch_size,
                        'isManualMode',  ac.is_manual_mode,
                        'createdAt',     ac.created_at
                    ) END,
                    'platfromData', CASE WHEN pd.id IS NULL THEN NULL ELSE json_build_object(
                        'id',         pd.id,
                        'unit',       pd.unit,
                        'unitCode',   pd.unit_code,
                        'zayadId',    pd.zayad_id,
                        'platform',   pd.platform,
                        'platformId', pd.platform_id,
                        'createdAt',  pd.created_at
                    ) END
                ) AS details,
                json_build_object(
                    'id',          s.id,
                    'type',        s.link_type,
                    'available',   s.link_available,
                    'quality',     s.link_quality,
                    'latency',     s.latency,
                    'reliability', s.reliability,
                    'timestamp',   s.link_timestamp
                ) AS link_quality
            FROM agent_syncs s
            LEFT JOIN agent_config  ac ON ac.id = s.agent_config_id
            LEFT JOIN platform_data pd ON pd.id = s.platform_data_id
            WHERE ${where}
            ${orderBy}
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `,
        countSql: (where) => `
            SELECT count(*)::bigint AS total
            FROM agent_syncs s
            LEFT JOIN agent_config  ac ON ac.id = s.agent_config_id
            LEFT JOIN platform_data pd ON pd.id = s.platform_data_id
            WHERE ${where}
        `,
    });
}

// Messages sortable columns (enum/jsonb cast to text for filters).
const MESSAGES_SORTABLE_COLUMNS = new Map([
    ['id',           'id'],
    ['receivedAt',   'received_at'],
    ['sentAt',       'sent_at'],
    ['content',      'content'],
    ['priority',     'priority'],
    ['contentJson',  'content_json::text'],
    ['contentExcel', 'content_excel'],
    ['contentType',  'content_type::text'],
    ['processed',    'processed'],
    ['agentId',      'agent_id'],
]);

const MESSAGES_BOOLEAN_COLS = new Set(['processed']);

function handleLoadHistoryAgentMessages(req, res) {
    return runIrmQuery(req, res, {
        colMap: MESSAGES_SORTABLE_COLUMNS,
        baseConditions: ['agent_id = $1'],
        booleanCols: MESSAGES_BOOLEAN_COLS,
        defaultOrderBy: 'ORDER BY received_at DESC',
        errorLabel: 'Failed to load agent messages',
        mainSql: (where, orderBy, limitIdx, offsetIdx) => `
            SELECT
                id,
                agent_id      AS "agentId",
                received_at   AS "receivedAt",
                sent_at       AS "sentAt",
                content,
                priority,
                content_json  AS "contentJson",
                content_excel AS "contentExcel",
                content_type  AS "contentType",
                processed
            FROM messages
            WHERE ${where}
            ${orderBy}
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `,
        countSql: (where) => `SELECT count(*)::bigint AS total FROM messages WHERE ${where}`,
    });
}

async function handleLoadAgentConfig(req, res) {
    try {
        const config = await getAgentConfig(req.params.id);
        res.json(config);
    } catch (error) {
        console.error('Failed to load agent config:', error);
        res.status(500).json({ error: 'Failed to load config' });
    }
}

app.get('/api/ui/agents', handleLoadAgents);
app.get('/manager/agents', handleLoadAgents);

app.get('/api/ui/agents/:id/history', handleLoadAgentHistory);

app.get('/api/history/agents', handleLoadHistoryAgents);
app.get('/agents-history', handleLoadHistoryAgents);

app.get('/api/history/agents/:id/syncs', handleLoadHistoryAgentSyncs);
app.get('/agent/:id/syncs', handleLoadHistoryAgentSyncs);

app.get('/api/history/agents/:id/messages', handleLoadHistoryAgentMessages);
app.get('/agent/:id/messages', handleLoadHistoryAgentMessages);

app.get('/api/ui/agents/:id/config', handleLoadAgentConfig);
app.get('/manager/agents/:id/config', handleLoadAgentConfig);

app.put('/api/ui/agents/:id/config', updateAgentConfig);
app.put('/agents/:id/configuration', updateAgentConfig);

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
        await saveHistorySync(agent);
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
        await initHistoryDb();
        await initMessagesDb();
        await seedMessages();
        app.listen(port, () => {
            console.log(`Manager service listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
}

startServer();
