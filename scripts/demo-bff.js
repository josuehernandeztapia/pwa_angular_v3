/**
 * Minimal demo BFF server for local testing
 * Provides /auth/login, /auth/demo-users, /auth/refresh endpoints.
 * Usage: npm run demo:bff
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.DEMO_BFF_PORT ? Number(process.env.DEMO_BFF_PORT) : 3000;
const HOST = process.env.DEMO_BFF_HOST || '0.0.0.0';

const demoUsers = [
  {
    email: 'asesor@conductores.com',
    password: 'demo123',
    user: {
      id: 'mock-asesor',
      name: 'Ana Torres',
      email: 'asesor@conductores.com',
      role: 'asesor',
      permissions: ['dashboard:view', 'clients:view', 'quotes:create', 'documents:upload', 'postventa:manage']
    }
  },
  {
    email: 'supervisor@conductores.com',
    password: 'super123',
    user: {
      id: 'mock-supervisor',
      name: 'Carlos Mendez',
      email: 'supervisor@conductores.com',
      role: 'supervisor',
      permissions: ['dashboard:view', 'clients:view', 'quotes:approve', 'documents:review', 'postventa:manage']
    }
  },
  {
    email: 'admin@conductores.com',
    password: 'admin123',
    user: {
      id: 'mock-admin',
      name: 'Maria Rodriguez',
      email: 'admin@conductores.com',
      role: 'admin',
      permissions: ['dashboard:view', 'clients:view', 'quotes:create', 'quotes:approve', 'admin:manage', 'postventa:manage']
    }
  }
];

const tokens = new Map();

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { message: 'Not found' });
}

function handleOptions(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end();
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function createAuthResponse(user) {
  const token = `demo-token-${user.id}-${Date.now()}`;
  const refreshToken = `demo-refresh-${user.id}-${Date.now()}`;
  tokens.set(refreshToken, user.id);
  return {
    user,
    token,
    refreshToken,
    expiresIn: 3600
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (pathname === '/auth/demo-users' && req.method === 'GET') {
    const users = demoUsers.map(({ email, user }) => ({
      email,
      role: user.role,
      name: user.name
    }));
    sendJson(res, 200, { users, message: 'Usuarios demo disponibles para testing' });
    return;
  }

  if (pathname === '/auth/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { email, password } = body;
      const match = demoUsers.find(account => account.email.toLowerCase() === String(email ?? '').toLowerCase());
      if (!match || match.password !== password) {
        sendJson(res, 401, { message: 'Credenciales incorrectas' });
        return;
      }
      const response = createAuthResponse(match.user);
      sendJson(res, 200, response);
    } catch (error) {
      sendJson(res, 400, { message: 'Solicitud inválida', detail: error.message });
    }
    return;
  }

  if (pathname === '/auth/refresh' && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const userId = tokens.get(token);
      if (!userId) {
        sendJson(res, 401, { message: 'Refresh token inválido' });
        return;
      }
      const account = demoUsers.find(acc => acc.user.id === userId);
      if (!account) {
        sendJson(res, 401, { message: 'Usuario no válido' });
        return;
      }
      const response = createAuthResponse(account.user);
      sendJson(res, 200, response);
    } catch (error) {
      sendJson(res, 400, { message: 'Solicitud inválida', detail: error.message });
    }
    return;
  }

  notFound(res);
});

server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Demo BFF corriendo en http://${HOST}:${PORT}`);
  console.log('   Endpoints disponibles:');
  console.log('   • POST /auth/login');
  console.log('   • GET  /auth/demo-users');
  console.log('   • POST /auth/refresh');
  console.log('\n   Credenciales demo:');
  demoUsers.forEach(user => {
    console.log(`   - ${user.email} / ${user.password}`);
  });
  console.log('\nPresiona CTRL+C para detener.');
});
