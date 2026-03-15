const express = require("express");
const { Client } = require("pg");
const { createClient } = require("redis");
const promClient = require("prom-client");

const app = express();
app.use(express.json());

/* ---------------------------
   PostgreSQL Connection
--------------------------- */

const db = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("PostgreSQL connection error", err));


/* ---------------------------
   Redis Connection
--------------------------- */

const redis = createClient({
  url: "redis://redis:6379"
});

redis.connect()
  .then(() => console.log("Connected to Redis"))
  .catch(err => console.error("Redis connection error", err));


/* ---------------------------
   Prometheus Metrics
--------------------------- */

promClient.collectDefaultMetrics();

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});


/* ---------------------------
   Rate Limiter Middleware
--------------------------- */

async function rateLimiter(req, res, next) {
  try {

    const ip = req.ip;
    const key = `rate_limit:${ip}`;

    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, 60);
    }

    if (requests > 10) {
      return res.status(429).send("Too many requests");
    }

    next();

  } catch (err) {
    console.error("Rate limiter error:", err);
    next();
  }
}


/* ---------------------------
   Routes
--------------------------- */

app.get("/health", rateLimiter, (req, res) => {
  res.send("Auth service healthy - version 2");
});


/* ---------------------------
   Start Server
--------------------------- */

app.listen(4000, () => {
  console.log("Auth service running on port 4000");
});
