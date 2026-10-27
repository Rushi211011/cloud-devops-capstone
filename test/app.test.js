const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');

test('CloudCart serves the homepage and health endpoint', async (t) => {
  const port = 3100 + Math.floor(Math.random() * 500);

  const app = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  t.after(() => {
    app.kill('SIGTERM');
  });

  async function getResponse(path) {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (app.exitCode !== null) {
        throw new Error('Application server exited unexpectedly');
      }

      try {
        return await new Promise((resolve, reject) => {
          const req = http.get(
            `http://127.0.0.1:${port}${path}`,
            (res) => {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', chunk => body += chunk);
              res.on('end', () => resolve({
                status: res.statusCode,
                body
              }));
            }
          );

          req.on('error', reject);
          req.setTimeout(1000, () => req.destroy(new Error('Timeout')));
        });
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw new Error('Application server did not become ready');
  }

  const homepage = await getResponse('/');
  assert.equal(homepage.status, 200);
  assert.match(homepage.body, /CloudCart/);

  const health = await getResponse('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), {
    status: 'healthy',
    application: 'CloudCart'
  });
});
