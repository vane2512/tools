const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || '';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api';

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', hasKey: !!API_KEY }));
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });

    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const response = await client.messages.create({
                model: data.model || 'claude-sonnet-4-5-20250514',
                max_tokens: data.max_tokens || 8192,
                messages: data.messages
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        } catch (error) {
            res.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: error.message } }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Key: ${API_KEY ? 'Set' : 'NOT SET'}`);
});
