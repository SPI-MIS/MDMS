const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', require('./routes/login'))

app.use('/api', require('./routes/user'))

app.use('/api', require('./routes/molds'))

app.use('/api', require('./routes/moldC'))

app.listen(3000, () => {
  console.log('✅ Backend running on http://localhost:3000')
})