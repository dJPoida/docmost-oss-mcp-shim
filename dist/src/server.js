import 'dotenv/config';
import express from 'express';
import { boot } from './docmostClient.js';
import { log } from './logger.js';
import { buildRouter } from './routes.js';
const { PORT = 3888, HOST = '127.0.0.1', SHIM_API_KEY } = process.env;
const app = express();
app.use(express.json({ limit: '1mb' }));
const requireShimKey = (req, res, next) => {
    if (!SHIM_API_KEY)
        return next();
    const key = req.header('X-SHIM-KEY');
    if (key === SHIM_API_KEY)
        return next();
    res.status(401).json({ error: 'Unauthorized (missing/invalid X-SHIM-KEY)' });
};
app.use(buildRouter({ requireShimKey }));
boot()
    .then(async () => {
    // Perform health check on startup
    const { healthCheck } = await import('./docmostClient.js');
    const health = await healthCheck();
    if (health.ok) {
        log('Health check passed - Docmost connection verified');
    }
    else {
        log('Health check failed - Docmost connection issues detected');
    }
    app.listen(Number(PORT), HOST, () => {
        console.log(`Docmost shim listening on http://${HOST}:${PORT}`);
        console.log(`Health status: ${health.ok ? 'OK' : 'FAILED'}`);
    });
})
    .catch((err) => {
    console.error('Initial login failed:', err?.message);
    process.exit(1);
});
//# sourceMappingURL=server.js.map