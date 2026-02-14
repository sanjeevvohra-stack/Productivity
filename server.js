import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CATEGORIES, extractTasksFromBrainDump } from './src/aiTaskExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const port = process.env.PORT || 3000;
const openAiApiKey = process.env.OPENAI_API_KEY;

function createAiClient(apiKey) {
  return {
    responses: {
      create: async ({ model, input, text }) => {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ model, input, text })
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${details}`);
        }

        return response.json();
      }
    }
  };
}

const aiClient = openAiApiKey ? createAiClient(openAiApiKey) : null;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
  }
  return data;
}

async function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestedPath).replace(/^\.+/, '');
  const fullPath = path.join(publicDir, safePath);

  try {
    const content = await readFile(fullPath);
    const ext = path.extname(fullPath);
    const contentType =
      ext === '.html'
        ? 'text/html'
        : ext === '.css'
          ? 'text/css'
          : ext === '.js'
            ? 'application/javascript'
            : 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/categories') {
    return sendJson(res, 200, { categories: DEFAULT_CATEGORIES });
  }

  if (req.method === 'POST' && req.url === '/api/ai/extract-tasks') {
    if (!aiClient) {
      return sendJson(res, 503, {
        error: 'AI extraction is unavailable because OPENAI_API_KEY is not configured.'
      });
    }

    try {
      const rawBody = await readBody(req);
      const { brainDumpText } = JSON.parse(rawBody || '{}');

      if (!brainDumpText || !brainDumpText.trim()) {
        return sendJson(res, 400, { error: 'brainDumpText is required.' });
      }

      const tasks = await extractTasksFromBrainDump({
        brainDumpText,
        aiClient,
        categories: DEFAULT_CATEGORIES
      });

      return sendJson(res, 200, { tasks });
    } catch (error) {
      console.error('Failed to extract tasks:', error);
      return sendJson(res, 500, { error: 'Unable to convert brain dump into tasks.' });
    }
  }

  if (req.method === 'GET') {
    return serveStatic(req, res);
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(port, () => {
  console.log(`Task manager running on http://localhost:${port}`);
});
