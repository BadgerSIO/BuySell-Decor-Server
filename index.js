const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();
//midleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("BuySell Decor server is running");
});

app.listen(port, () => console.log(`BuySell Decor portal running on ${port}`));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gqpfnmn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    const categoryCollections = client
      .db("buySellDecor")
      .collection("categories");
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoryCollections.find(query).toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);
