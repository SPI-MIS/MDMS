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

// 根路徑 (避免 404)
app.get('/', (req, res) => {
  res.status(200).send('Backend is running!');
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


app.listen(3000, () => {
  console.log('✅ Backend running on http://localhost:3000')
})