// ============================================
// ZKTeco ADMS Middleware - Production v1.0.0
// ============================================
const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const app = express();
const PORT = process.env.PORT || 8081;

const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'zkteco',
    user: process.env.DB_USER || 'zk_admin',
    password: process.env.DB_PASSWORD,
    max: 20
});

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    keyPrefix: 'zk:'
});

app.use(express.text({ type: '*/*', limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const IP_WHITELIST = new Set((process.env.ALLOWED_IPS || '').split(',').filter(Boolean));
app.use((req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (IP_WHITELIST.size && !IP_WHITELIST.has(clientIp)) {
        return res.status(403).send('FORBIDDEN');
    }
    next();
});

app.post('/iclock/cdata', async (req, res) => {
    const { SN: deviceSn, table } = req.query;
    const rawBody = req.body;

    try {
        switch(table) {
            case 'ATTLOG':
                await saveAttendanceBatch(parseAttendanceLogs(rawBody, deviceSn));
                break;
            case 'USERINFO':
                await upsertUsers(parseUserInfo(rawBody, deviceSn));
                break;
            case 'BIODATA':
            case 'FINGERTMP':
                const templates = parseBiometricData(rawBody, deviceSn, table);
                await saveBiometricTemplates(templates);
                await queueBiometricDistribution(templates);
                break;
            case 'OPERLOG':
                await updateCommandStatus(parseOperationLogs(rawBody, deviceSn));
                break;
        }
        res.send('OK');
    } catch (error) {
        console.error(`Error processing ${table}:`, error);
        res.status(500).send('ERROR');
    }
});

app.get('/iclock/getrequest', async (req, res) => {
    const { SN: deviceSn } = req.query;

    try {
        const pendingCommand = await redis.lpop(`cmd:${deviceSn}`);
        if (pendingCommand) {
            const { commandId, payload } = JSON.parse(pendingCommand);
            await pgPool.query(`UPDATE device_command_queue SET status = 'DELIVERED', delivered_at = NOW() WHERE command_id = $1`, [commandId]);
            return res.send(`C:${commandId}:${payload}\n`);
        }
        res.send('OK');
    } catch (error) {
        console.error(`Command error for ${deviceSn}:`, error);
        res.send('OK');
    }
});

app.post('/iclock/devicecmd', async (req, res) => {
    const params = new URLSearchParams(req.body);
    const commandId = params.get('ID');
    const returnCode = params.get('Return');

    if (commandId) {
        const status = returnCode === '0' ? 'EXECUTED' : 'FAILED';
        await pgPool.query(`UPDATE device_command_queue SET status = $1, executed_at = NOW() WHERE command_id = $2`, [status, commandId]);

        if (status === 'FAILED') {
            const result = await pgPool.query(`SELECT retry_count FROM device_command_queue WHERE command_id = $1`, [commandId]);
            if (result.rows[0]?.retry_count < 3) {
                await pgPool.query(`UPDATE device_command_queue SET status = 'PENDING', retry_count = retry_count + 1 WHERE command_id = $1`, [commandId]);
                const cmd = await pgPool.query(`SELECT command_payload FROM device_command_queue WHERE command_id = $1`, [commandId]);
                await redis.rpush(`cmd:${deviceSn}`, JSON.stringify({ commandId, payload: cmd.rows[0].command_payload }));
            }
        }
    }
    res.send('OK');
});

function parseAttendanceLogs(rawData, deviceSn) {
    const records = [];
    for (const line of rawData.trim().split('\n')) {
        const fields = line.split('\t');
        if (fields.length >= 3) {
            records.push({
                device_sn: deviceSn,
                user_id: fields[0],
                timestamp: fields[1],
                status: parseInt(fields[2]),
                verify_mode: fields[3] ? parseInt(fields[3]) : null,
                work_code: fields[4] ? parseInt(fields[4]) : null
            });
        }
    }
    return records;
}

async function saveAttendanceBatch(records) {
    for (const record of records) {
        await pgPool.query(`INSERT INTO attendance_logs (device_sn, user_id, timestamp, status, verify_mode, work_code) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`, [record.device_sn, record.user_id, record.timestamp, record.status, record.verify_mode, record.work_code]);
    }
}

function parseBiometricData(rawData, deviceSn, tableType) {
    const templates = [];
    for (const line of rawData.trim().split('\n')) {
        const data = {};
        for (const field of line.split('\t')) {
            const [key, value] = field.split('=');
            if (key && value) data[key] = value;
        }
        if (data.Pin && data.Tmp) {
            templates.push({
                user_id: data.Pin,
                device_sn: deviceSn,
                biometric_type: tableType === 'FINGERTMP' ? 'FINGER' : 'FACE',
                finger_position: data.No ? parseInt(data.No) : null,
                algorithm_major: data.MajorVer ? parseInt(data.MajorVer) : null,
                algorithm_minor: data.MinorVer ? parseInt(data.MinorVer) : null,
                template_data: data.Tmp,
                algorithm_version: data.MajorVer >= 10 ? 'V10.0' : (data.MajorVer >= 9 ? 'V9.0' : 'V8.0')
            });
        }
    }
    return templates;
}

async function saveBiometricTemplates(templates) {
    for (const tpl of templates) {
        await pgPool.query(`INSERT INTO biometric_templates (user_id, device_sn, biometric_type, finger_position, algorithm_major, algorithm_minor, template_data, algorithm_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id, device_sn, biometric_type, finger_position) DO UPDATE SET template_data = EXCLUDED.template_data, last_synced_at = NOW()`, [tpl.user_id, tpl.device_sn, tpl.biometric_type, tpl.finger_position, tpl.algorithm_major, tpl.algorithm_minor, tpl.template_data, tpl.algorithm_version]);
    }
}

async function queueBiometricDistribution(templates) {
    for (const tpl of templates) {
        const allDevices = await pgPool.query(`SELECT sn, algorithm_version FROM devices WHERE sn != $1`, [tpl.device_sn]);
        for (const device of allDevices.rows) {
            const