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
        // Route that delays response header/body by 10s
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body>Slow Response</body></html>');
        }, 10000);
        return;
      }

      if (url === '/delayed-images') {
        // Serves HTML with delayed image loading
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Delayed Images</title></head>
          <body>
            <h1>Delayed Images Page</h1>
            <img id="img1" src="/img-delayed.png" alt="delayed image" width="200" height="200" />
            <script>
              setTimeout(() => {
                const img2 = document.createElement('img');
                img2.id = 'img2';
                img2.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                document.body.appendChild(img2);
              }, 1000);
            </script>
          </body>
          </html>
        `);
        return;
      }

      if (url === '/img-delayed.png') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          // 1x1 transparent PNG
          const pngBuffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          );
          res.end(pngBuffer);
        }, 1500);
        return;
      }

      if (url === '/delayed-fonts') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              @font-face {
                font-family: 'SlowCustomFont';
                src: url('/slow-font.woff2') format('woff2');
              }
              body {
                font-family: 'SlowCustomFont', sans-serif;
              }
            </style>
          </head>
          <body>
            <h1 id="font-target">Delayed Font Loaded</h1>
          </body>
          </html>
        `);
        return;
      }

      if (url === '/slow-font.woff2') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'font/woff2' });
          res.end(Buffer.alloc(100));
        }, 1500);
        return;
      }

      if (url === '/lazy-loaded') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              .spacer { height: 1500px; background: #eee; }
              .lazy-box { height: 200px; background: orange; font-size: 24px; }
            </style>
          </head>
          <body>
            <h1>Scroll Down For Lazy Content</h1>
            <div class="spacer">Spacer</div>
            <div id="lazy" class="lazy-box" style="display:none;">I WAS LAZY LOADED</div>
            <script>
              window.addEventListener('scroll', () => {
                if (window.scrollY > 500) {
                  document.getElementById('lazy').style.display = 'block';
                }
              });
            </script>
          </body>
          </html>
        `);
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
            <div class="box" id="anim-box">Animated Box</div>
            <canvas id="canvas" width="100" height="100"></canvas>
            <script>
              const canvas = document.getElementById('canvas');
              const ctx = canvas.getContext('2d');
              let angle = 0;
              function loop() {
                angle += 0.05;
                ctx.clearRect(0, 0, 100, 100);
                ctx.fillRect(Math.sin(angle) * 40 + 40, 10, 20, 20);
                requestAnimationFrame(loop);
              }
              requestAnimationFrame(loop);
            </script>
          </body>
          </html>
        `);
        return;
      }

      if (url === '/dynamic-dom') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Dynamic DOM</title></head>
          <body>
            <div id="root">Initial Content</div>
            <script>
              setTimeout(() => {
                document.getElementById('root').innerHTML = '<h1 id="rendered">Dynamically Rendered Async Content</h1>';
              }, 1200);
            </script>
          </body>
          </html>
        `);
        return;
      }

      if (url === '/spa') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>SPA Nav</title></head>
          <body>
            <div id="app">Home Page</div>
            <script>
              setTimeout(() => {
                history.pushState({}, 'Dashboard', '/spa/dashboard');
                document.getElementById('app').innerHTML = '<h1 id="spa-page">SPA Dashboard Page</h1>';
              }, 800);
            </script>
          </body>
          </html>
        `);
        return;
      }

      if (url === '/failing-500') {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<html><body>Internal Server Error 500</body></html>');
        return;
      }

      if (url === '/hanging-request') {
        // Intentionally hang: headers/socket connection established, body never finished
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<html><body>Hanging Header...');
        // Do not call res.end()
        return;
      }

      if (url === '/very-long-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { margin: 0; padding: 0; }
              .section { height: 2000px; padding: 20px; font-size: 24px; border-bottom: 2px solid #ccc; }
              #top { background: #fee2e2; }
              #middle { background: #dbeafe; }
              #bottom { background: #dcfce7; height: 1000px; }
            </style>
          </head>
          <body>
            <div id="top" class="section">Top Section (0px - 2000px)</div>
            <div class="section">Section 2 (2000px - 4000px)</div>
            <div id="middle" class="section">Middle Section (4000px - 6000px)</div>
            <div class="section">Section 4 (6000px - 8000px)</div>
            <div id="bottom">Bottom Section (8000px - 9000px)</div>
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
