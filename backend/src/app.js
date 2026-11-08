const express = require('express');
const cors = require('cors');
const config = require('./config');
const { requireAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const readingRoutes = require('./routes/readings');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/readings', requireAuth, readingRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
