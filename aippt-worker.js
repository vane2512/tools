/**
 * AIPPT Cloudflare Worker 代理 v2
 * 模拟 Claude Code 请求特征
 */

export default {
  async fetch(request, env) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 健康检查
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 只处理 /v1/messages
    if (request.method !== 'POST' || !url.pathname.endsWith('/v1/messages')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      // 获取 API Key
      const apiKey = request.headers.get('x-api-key') ||
                     request.headers.get('authorization')?.replace('Bearer ', '') ||
                     env.ANTHROPIC_AUTH_TOKEN;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API Key required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 读取请求体
      const body = await request.text();

      // 目标 API
      const targetUrl = (env.ANTHROPIC_BASE_URL || 'https://tik2i1kw.cn-nb1.rainapp.top/api') + '/v1/messages';

      // 模拟 Claude Code 的完整请求头
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // Claude Code 特有的头
          'User-Agent': 'anthropic-typescript/0.39.0',
          'x-stainless-lang': 'js',
          'x-stainless-package-version': '0.39.0',
          'x-stainless-os': 'MacOS',
          'x-stainless-arch': 'arm64',
          'x-stainless-runtime': 'node',
          'x-stainless-runtime-version': 'v22.12.0',
          // 标识为 Claude Code
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: body,
      });

      // 返回响应
      const responseData = await response.text();

      return new Response(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
