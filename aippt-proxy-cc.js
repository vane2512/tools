#!/usr/bin/env node
/**
 * AIPPT 本地代理服务 - 使用 Claude Code 内置 SDK
 */

const http = require('http');
const path = require('path');

// 尝试使用 Claude Code 的 SDK
let Anthropic;
const ccPaths = [
    path.join(process.env.HOME, '.nvm/versions/node/v24.12.0/lib/node_modules/@anthropic-ai/claude-code/node_modules/@anthropic-ai/sdk'),
    path.join(process.env.HOME, '.nvm/versions/node/v22.12.0/lib/node_modules/@anthropic-ai/claude-code/node_modules/@anthropic-ai/sdk'),
    '@anthropic-ai/sdk'
];

for (const p of ccPaths) {
    try {
        Anthropic = require(p);
        console.log(`[INFO] Using SDK from: ${p}`);
        break;
    } catch (e) {
        continue;
    }
}

if (!Anthropic) {
    console.error('Cannot find Anthropic SDK');
    process.exit(1);
}

const PORT = process.env.PORT || 3456;
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(`${colors[color]}[AIPPT CC Proxy]${colors.reset}`, ...args);
}

// 创建 Anthropic 客户端 - 模拟 Claude Code 配置
const client = new Anthropic.default({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31,interleaved-thinking-2025-05-14'
    }
});

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'claude-code-sdk', baseURL: BASE_URL }));
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    log('cyan', `${req.method} ${req.url}`);

    let body = '';
    req.on('data', chunk => { body += chunk; });

    req.on('end', async () => {
        try {
            const requestData = JSON.parse(body);
            log('blue', `Model: ${requestData.model}, Tokens: ${requestData.max_tokens}`);

            const response = await client.messages.create({
                model: requestData.model || 'claude-sonnet-4-5-20250514',
                max_tokens: requestData.max_tokens || 8192,
                messages: requestData.messages
            });

            log('green', `Response: OK`);

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(response));

        } catch (error) {
            log('red', `Error: ${error.message}`);
            res.writeHead(error.status || 500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: { message: error.message, type: error.name } }));
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    log('green', '========================================');
    log('green', '  AIPPT Claude Code SDK 代理已启动');
    log('green', '========================================');
    console.log('');
    log('blue', `代理地址: http://localhost:${PORT}`);
    log('blue', `目标 API: ${BASE_URL}`);
    log('yellow', API_KEY ? '已配置 API Key' : '未配置 API Key');
    console.log('');
});

process.on('SIGINT', () => {
    log('yellow', '正在关闭...');
    server.close(() => process.exit(0));
});
