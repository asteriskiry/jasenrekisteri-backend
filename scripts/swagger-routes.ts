import express from 'express'
import apiRoutes from '../server/routes/apis/index.js'

const app = express()

app.use('/api', apiRoutes)

export default app
