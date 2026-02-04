const express = require('express')
const cors = require('cors')
const app = express()
const router = express.Router()

app.use(cors())
app.use(express.json())

app.use('/api', require('./routes/login'))

app.use('/api', require('./routes/user'))

app.use('/api', require('./routes/molds'))

app.use('/api', require('./routes/moldC'))

app.use('/api', require('./routes/material'))

app.use('/api', require('./routes/vendor'))

app.use('/api', require('./routes/moldbasic'))

app.use('/api', require('./routes/spi'))

app.use('/api', require('./routes/votes'))

app.use('/api', require('./routes/exclusion'))

app.use('/api', require('./routes/tool'))

app.use('/api', require('./routes/addap'))

// simple request logger
const logger = require('./utils/logger');
app.use((req, res, next) => {
  logger.debug('[REQ]', new Date().toISOString(), 'PID', process.pid, req.method, req.url);
  next();
});

// 根路徑 (避免 404)
app.get('/', (req, res) => {
  logger.debug('[HANDLER] / called');
  res.status(200).send('Backend is running!');
});

// 健康檢查端點
app.get('/health', (req, res) => {
  logger.debug('[HANDLER] /health called');
  res.status(200).json({ status: 'ok' });
});


app.listen(4000, '0.0.0.0', () => {
  logger.info('✅ Backend running on http://localhost:4000', 'PID', process.pid)
})

// global error handlers for better debugging
process.on('uncaughtException', (err) => {
  logger.error('[uncaughtException]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
  logger.error('[unhandledRejection] Promise:', p, 'reason:', reason);
});
process.on('exit', (code) => {
  logger.info('[process exit]', code);
});

// module.exports = router; 