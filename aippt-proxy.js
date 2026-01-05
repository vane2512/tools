#!/usr/bin/env node
/**
 * AIPPT 本地代理服务
 * 用于转发浏览器请求到 88code API（绕过 CORS 和 Claude Code 限制）
 *
 * 使用方法：node aippt-proxy.js
 * 默认端口：3456
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 配置
const PORT = process.env.PORT || 3456;
const TARGET_API = process.env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api';
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';

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
    console.log(`${colors[color]}[AIPPT Proxy]${colors.reset}`, ...args);
}

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
        res.end(JSON.stringify({ status: 'ok', target: TARGET_API }));
        return;
    }

    // 只处理 POST 请求到 /v1/messages
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
            // 解析请求
            const requestData = JSON.parse(body);

            // 从请求头获取 API Key，或使用环境变量
            let apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || API_KEY;

            if (!apiKey) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API Key required' }));
                return;
            }

            log('blue', `Model: ${requestData.model}, Tokens: ${requestData.max_tokens}`);

            // 构建目标 URL - 确保路径正确拼接
            const baseUrl = TARGET_API.endsWith('/') ? TARGET_API.slice(0, -1) : TARGET_API;
            const targetUrl = new URL(baseUrl + '/v1/messages');

            log('cyan', `Target: ${targetUrl.href}`);

            // 准备请求选项 - 完整模拟 Claude Code
            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || 443,
                path: targetUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    // Anthropic SDK headers
                    'User-Agent': 'anthropic-typescript/0.39.0',
                    'x-stainless-lang': 'js',
                    'x-stainless-package-version': '0.39.0',
                    'x-stainless-os': 'MacOS',
                    'x-stainless-arch': 'arm64',
                    'x-stainless-runtime': 'node',
                    'x-stainless-runtime-version': process.version,
                    // Claude Code 特有
                    'anthropic-beta': 'prompt-caching-2024-07-31,interleaved-thinking-2025-05-14'
                }
            };

            // 发起请求到 88code
            const proxyReq = https.request(options, (proxyRes) => {
                let responseData = '';

                proxyRes.on('data', chunk => { responseData += chunk; });

                proxyRes.on('end', () => {
                    log('green', `Response: ${proxyRes.statusCode}`);

                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(responseData);
                });
            });

            proxyReq.on('error', (error) => {
                log('red', `Error: ${error.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            });

            // 发送请求体
            proxyReq.write(body);
            proxyReq.end();

        } catch (error) {
            log('red', `Parse error: ${error.message}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request' }));
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log('');
    log('green', '========================================');
    log('green', '  AIPPT 本地代理服务已启动');
    log('green', '========================================');
    console.log('');
    log('blue', `代理地址: http://localhost:${PORT}`);
    log('blue', `目标 API: ${TARGET_API}`);
    log('yellow', API_KEY ? '已配置 API Key (环境变量)' : '使用请求中的 API Key');
    console.log('');
    log('cyan', '在 AIPPT 设置中填写:');
    log('cyan', `  API URL: http://localhost:${PORT}`);
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
