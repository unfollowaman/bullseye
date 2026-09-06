export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Bullseye Dashboard</h1>
      <p>Local-first website capture &amp; screen recording engine (Phase 1: Foundation)</p>

      <section style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
        <h2>System Status</h2>
        <p><strong>Environment:</strong> Phase 1 Foundation Active</p>
        <p><strong>Health Endpoint:</strong> <a href="/api/health">/api/health</a></p>
        <p><strong>Capture Status Endpoint:</strong> <a href="/api/capture/status">/api/capture/status</a></p>
      </section>

      <section style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
        <h2>Capture Controller Stub</h2>
        <p>Ready for Phase 2 capture implementation.</p>
      </section>
    </main>
  );
}
