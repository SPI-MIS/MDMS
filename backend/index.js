const express = require('express')
const cors = require('cors')
const app = express()
const router = express.Router()

app.use(cors())
app.use(express.json())

// 防緩存中間件 - 為所有 API 響應添加時間戳和緩存禁用頭
app.use('/api', (req, res, next) => {
  // 添加時間戳以防止緩存
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Timestamp': new Date().toISOString(),
    'X-Request-Time': Date.now().toString()
  })
  
  // 在查詢參數中添加時間戳（如果還沒有）
  if (!req.query._t) {
    req.query._t = Date.now()
  }
  
  next()
})

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