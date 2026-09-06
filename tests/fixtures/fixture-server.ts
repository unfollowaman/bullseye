import http from 'http';
import { AddressInfo } from 'net';

export interface TestServer {
  server: http.Server;
  url: string;
  close: () => Promise<void>;
}

export function startTestServer(): Promise<TestServer> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/slow') {
        // Route that hangs/delays response to test timeout
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body>Slow Response</body></html>');
        }, 10000);
        return;
      }

      if (url === '/animated') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              @keyframes slide {
                from { transform: translateX(0px); }
                to { transform: translateX(200px); }
              }
              .box {
                width: 100px;
                height: 100px;
                background: red;
                animation: slide 5s infinite linear;
              }
            </style>
          </head>
          <body>
            <div class="box">Animated Box</div>
          </body>
          </html>
        `);
        return;
      }

      // Default test page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Fixture Page</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
              background-color: #f0f0f0;
            }
            .viewport-marker {
              height: 400px;
              background: #3b82f6;
              color: white;
              padding: 20px;
            }
            .below-fold-marker {
              margin-top: 1000px;
              height: 400px;
              background: #10b981;
              color: white;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div class="viewport-marker">
            <h1>Header Viewport</h1>
            <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='blue'/></svg>" alt="test svg"/>
          </div>
          <div class="below-fold-marker">
            <h2>Below the Fold Content</h2>
          </div>
        </body>
        </html>
      `);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${addr.port}`;
      resolve({
        server,
        url,
        close: () =>
          new Promise((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}
