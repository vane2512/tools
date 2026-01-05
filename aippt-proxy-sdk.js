#!/usr/bin/env node
/**
 * AIPPT 本地代理服务 - SDK 版本
 * 使用官方 Anthropic SDK 发送请求（与 Claude Code 完全一致）
 */

const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3456;
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(`${colors[color]}[AIPPT SDK Proxy]${colors.reset}`, ...args);
}

// 创建 Anthropic 客户端
const client = new Anthropic({
    apiKey: API_KEY,
    baseURL: BASE_URL
});

// 创建服务器
const server = http.createServer(async (req, res) => {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
    res.setHeader('Access-Control-Max-Age', '86400');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 健康检查
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'sdk', baseURL: BASE_URL }));
        return;
    }

    // 只处理 POST 请求
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    log('cyan', `${req.method} ${req.url}`);

    // 读取请求体
    let body = '';
    req.on('data', chunk => { body += chunk; });

    req.on('end', async () => {
        try {
            const requestData = JSON.parse(body);

            log('blue', `Model: ${requestData.model}, Tokens: ${requestData.max_tokens}`);

            // 使用 SDK 发送请求
            const response = await client.messages.create({
                model: requestData.model || 'claude-sonnet-4-5-20250514',
                max_tokens: requestData.max_tokens || 8192,
                messages: requestData.messages
            });

            log('green', `Response: OK, Stop reason: ${response.stop_reason}`);

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
            res.end(JSON.stringify({
                error: {
                    message: error.message,
                    type: error.name
                }
            }));
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log('');
    log('green', '========================================');
    log('green', '  AIPPT SDK 代理服务已启动');
    log('green', '========================================');
    console.log('');
    log('blue', `代理地址: http://localhost:${PORT}`);
    log('blue', `目标 API: ${BASE_URL}`);
    log('yellow', API_KEY ? '已配置 API Key (环境变量)' : '使用请求中的 API Key');
    log('cyan', '使用官方 Anthropic SDK 发送请求');
    console.log('');
    log('yellow', '按 Ctrl+C 停止服务');
    console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
    log('yellow', '正在关闭...');
    server.close(() => {
        log('green', '服务已停止');
        process.exit(0);
    });
});
