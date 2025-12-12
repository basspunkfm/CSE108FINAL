// Quick script to check if all required servers are running
// Run with: node check-servers.js

import http from 'http';

const servers = [
  { name: 'Flask Backend', port: 5000, host: 'localhost' },
  { name: 'Socket.IO Server', port: 3000, host: 'localhost' },
  { name: 'Vite Dev Server', port: 5173, host: 'localhost' }
];

function checkServer(server) {
  return new Promise((resolve) => {
    const req = http.get(`http://${server.host}:${server.port}`, (res) => {
      resolve({ ...server, status: 'RUNNING ✅', statusCode: res.statusCode });
    });

    req.on('error', () => {
      resolve({ ...server, status: 'NOT RUNNING ❌', error: true });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ ...server, status: 'TIMEOUT ⏱️', error: true });
    });
  });
}

async function checkAllServers() {
  console.log('🔍 Checking server status...\n');

  const results = await Promise.all(servers.map(checkServer));

  console.log('╔════════════════════════════════════════╗');
  console.log('║      BATTLESHIP SERVER STATUS         ║');
  console.log('╚════════════════════════════════════════╝\n');

  results.forEach(result => {
    console.log(`${result.name.padEnd(20)} [Port ${result.port}] - ${result.status}`);
  });

  const allRunning = results.every(r => !r.error);

  console.log('\n' + '='.repeat(42));

  if (allRunning) {
    console.log('✅ ALL SERVERS ARE RUNNING!');
    console.log('🎮 You can now play at: http://localhost:5000');
  } else {
    console.log('❌ SOME SERVERS ARE NOT RUNNING!\n');
    console.log('To start missing servers:\n');

    results.forEach(result => {
      if (result.error) {
        const command = result.port === 5000 ? 'python app.py' :
                       result.port === 3000 ? 'npm run server' :
                       'npm run dev';
        console.log(`  ${result.name}: ${command}`);
      }
    });
  }

  console.log('='.repeat(42));
}

checkAllServers();
