const express = require('express');
const cors = require('cors');
const app = express();

const authMiddleware = require('./middleware/auth');
const logger = require('./utils/logger');

app.use(cors());
app.use(express.json());

// �{�Ҥ�����]�� token �~�|�]�w req.user�A�S�������׳X�ݡ^
app.use(authMiddleware);

// ���w�s������ - �[ timestamp header + cache disabled
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Timestamp': new Date().toISOString(),
    'X-Request-Time': Date.now().toString()
  });

  if (!req.query._t) {
    req.query._t = Date.now();
  }

  next();
});

// ���ѼҲ�
app.use('/api', require('./routes/login'));
app.use('/api', require('./routes/user'));
app.use('/api', require('./routes/molds'));
app.use('/api', require('./routes/moldC'));
app.use('/api', require('./routes/material'));
app.use('/api', require('./routes/vendor'));
app.use('/api', require('./routes/moldbasic'));
app.use('/api', require('./routes/spi'));
app.use('/api', require('./routes/votes'));
app.use('/api', require('./routes/exclusion'));
app.use('/api', require('./routes/tool'));
app.use('/api', require('./routes/addap'));

// Bento ���ѡ]�ݽT�{bento���Ѧb�̫���J�^
try {
  const bentoRoutes = require('./routes/bento');
  console.log(' ✅ Bento routes loaded successfully');
  app.use('/api/bento', bentoRoutes);
} catch (err) {
  console.error(' ❌ Failed to load bento routes:', err.message);
  console.error(err.stack);
}

// ���d�ˬd�P��¦����
app.get('/test', (req, res) => res.json({ message: 'Server is running!' }));
app.get('/', (req, res) => res.status(200).send('Backend is running!'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use((req, res, next) => {
  logger.debug('[REQ]', new Date().toISOString(), 'PID', process.pid, req.method, req.url);
  next();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(` Backend running on http://localhost:${PORT}`, 'PID', process.pid);
});

process.on('uncaughtException', (err) => {
  logger.error('[uncaughtException]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
  logger.error('[unhandledRejection] Promise:', p, 'reason:', reason);
});
process.on('exit', (code) => {
  logger.info('[process exit]', code);
});
