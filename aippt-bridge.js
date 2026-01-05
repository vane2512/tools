#!/usr/bin/env node
/**
 * AIPPT Bridge - 通过 Claude Code CLI 转发请求
 * 原理：使用 Claude Code 的 --print 模式执行单次请求
 */

const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3456;

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(`${colors[color]}[AIPPT Bridge]${colors.reset}`, ...args);
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'claude-code-bridge' }));
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
            const prompt = requestData.messages[0]?.content || '';

            log('blue', `Prompt length: ${prompt.length} chars`);

            // 使用 Claude Code 的 --print 模式，通过 stdin 传递 prompt
            const claude = spawn('claude', [
                '-p',
                '--model', 'sonnet',
                '--output-format', 'text'
            ], {
                env: process.env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // 通过 stdin 发送 prompt（避免命令行长度限制）
            claude.stdin.write(prompt);
            claude.stdin.end();

            let output = '';
            let errorOutput = '';

            claude.stdout.on('data', (data) => {
                output += data.toString();
            });

            claude.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            claude.on('close', (code) => {
                if (code !== 0) {
                    log('red', `Claude exited with code ${code}: ${errorOutput}`);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: errorOutput || 'Claude Code failed' } }));
                    return;
                }

                log('green', `Response: OK, length: ${output.length}`);

                // 构造 Anthropic 格式的响应
                const response = {
                    content: [{ type: 'text', text: output }],
                    stop_reason: 'end_turn',
                    model: requestData.model
                };

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(response));
            });

            claude.on('error', (err) => {
                log('red', `Spawn error: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: err.message } }));
            });

        } catch (error) {
            log('red', `Error: ${error.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: error.message } }));
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    log('green', '========================================');
    log('green', '  AIPPT Claude Code Bridge 已启动');
    log('green', '========================================');
    console.log('');
    log('blue', `代理地址: http://localhost:${PORT}`);
    log('cyan', '通过 Claude Code CLI 转发请求');
    console.log('');
});

process.on('SIGINT', () => {
    log('yellow', '正在关闭...');
    server.close(() => process.exit(0));
});
