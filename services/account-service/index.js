const express = require("express");
const { Client } = require("pg");
const promClient = require("prom-client");

const app = express();
app.use(express.json());

/* ---------------------------
   PostgreSQL Connection
--------------------------- */

const db = new Client({
  host: process.env.DB_HOST || "postgres",
  user: "postgres",
  password: "postgres123",
  database: "banking",
  port: 5432
});

db.connect()
  .then(() => console.log("Account service connected to PostgreSQL"))
  .catch(err => console.error("DB connection error", err));


/* ---------------------------
   Prometheus Metrics
--------------------------- */

promClient.collectDefaultMetrics();

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});


/* ---------------------------
   Routes
--------------------------- */

app.get("/health", (req, res) => {
  res.send("Account service healthy");
});

app.post("/create", async (req, res) => {

  const { name, balance } = req.body;

  try {

    await db.query(
      "INSERT INTO accounts(name,balance) VALUES($1,$2)",
      [name, balance]
    );

    res.send("Account created");

  } catch (err) {

    console.error(err);
    res.status(500).send("Error creating account");

  }

});


app.listen(5000, () => {
  console.log("Account service running on port 5000");
});
