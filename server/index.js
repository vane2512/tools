/**
 * AIPPT Bridge Server
 * 部署到 Render/Railway 等云服务
 */

const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3456;
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api';

// 创建 Anthropic 客户端
const client = new Anthropic.default({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    defaultHeaders: {
        'anthropic-beta': 'prompt-caching-2024-07-31,interleaved-thinking-2025-05-14'
    }
});

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 健康检查
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            message: 'AIPPT Bridge Server',
            hasApiKey: !!API_KEY
        }));
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    let body = '';
    req.on('data', chunk => { body += chunk; });

    req.on('end', async () => {
        try {
            const requestData = JSON.parse(body);
            console.log(`Model: ${requestData.model}, Messages: ${requestData.messages?.length}`);

            const response = await client.messages.create({
                model: requestData.model || 'claude-sonnet-4-5-20250514',
                max_tokens: requestData.max_tokens || 8192,
                messages: requestData.messages
            });

            console.log(`Response OK, stop_reason: ${response.stop_reason}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));

        } catch (error) {
            console.error(`Error: ${error.message}`);
            res.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: error.message,
                    type: error.name
                }
            }));
        }
    });
});

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  AIPPT Bridge Server Started');
    console.log('='.repeat(50));
    console.log(`Port: ${PORT}`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`API Key: ${API_KEY ? 'Configured' : 'NOT SET!'}`);
    console.log('='.repeat(50));
});
