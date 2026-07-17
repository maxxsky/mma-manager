import http from "node:http";

/**
 * Start the app on a random port for testing.
 * Returns { app, server, url, port, request }.
 * `request(method, path, body?, headers?)` is a convenience helper.
 */
export async function setupTestApp() {
  // Override DATABASE_URL for all server modules before they import pg
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5432/mma_manager_test";
  const { app } = await import("../app.js");

  const server = app.listen(0);
  const port = await new Promise((resolve) => server.on("listening", () => resolve(server.address().port)));
  const url = `http://127.0.0.1:${port}`;

  const request = (method, path, body, headers) =>
    new Promise((resolve, reject) => {
      const opts = { hostname: "127.0.0.1", port, path, method, headers: headers || {} };
      if (body) {
        const data = JSON.stringify(body);
        opts.headers = { ...opts.headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) };
      }
      const req = http.request(opts, (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(chunks); } catch { /* ignore */ }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: chunks });
        });
      });
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });

  return { app, server, url, port, request };
}
