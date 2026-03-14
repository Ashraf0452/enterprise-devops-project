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
  .then(() => console.log("Payment service connected to PostgreSQL"))
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
  res.send("Payment service healthy");
});


app.post("/transfer", async (req, res) => {

  const { from, to, amount } = req.body;

  try {

    await db.query("BEGIN");

    const sender = await db.query(
      "SELECT balance FROM accounts WHERE name=$1",
      [from]
    );

    if (sender.rows[0].balance < amount) {
      throw new Error("Insufficient funds");
    }

    await db.query(
      "UPDATE accounts SET balance = balance - $1 WHERE name=$2",
      [amount, from]
    );

    await db.query(
      "UPDATE accounts SET balance = balance + $1 WHERE name=$2",
      [amount, to]
    );

    await db.query("COMMIT");

    res.send("Transfer successful");

  } catch (err) {

    await db.query("ROLLBACK");
    res.status(500).send(err.message);

  }

});


app.listen(6000, () => {
  console.log("Payment service running on port 6000");
});
