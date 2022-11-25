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
    const userCollections = client.db("buySellDecor").collection("users");

    //categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoryCollections.find(query).toArray();
      res.send(result);
    });

    //users collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {
        email: user.email,
      };
      const alreadyExist = await userCollections.findOne(query);
      if (alreadyExist) {
        return res.send({ userExist: true });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    });
    //check admin
    app.get("/user/admin/:email", async (req, res) => {
      const reqEmail = req.params.email;
      const query = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    //check seller
    app.get("/user/seller/:email", async (req, res) => {
      const reqEmail = req.params.email;
      const query = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });
  } finally {
  }
}
run().catch(console.log);
