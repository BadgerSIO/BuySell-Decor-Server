const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();
//midleware
app.use(cors());
app.use(express.json());
//verify jwt token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).send({ message: "Access forbiden" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const blogCollections = client.db("buySellDecor").collection("blogs");
    const productCollections = client.db("buySellDecor").collection("products");
    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = {
        email: decodedEmail,
      };
      const user = await userCollections.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };
    //verify admin
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = {
        email: decodedEmail,
      };
      const user = await userCollections.findOne(query);
      if (user?.role !== "seller" && user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    //categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoryCollections.find(query).toArray();
      res.send(result);
    });

    //add to users collections
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
    //delete user
    app.delete("/deleteuser/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const result = await userCollections.deleteOne(query);
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
    //check seller verified or not
    app.get("/user/sellerVerified/:email", async (req, res) => {
      const reqEmail = req.params.email;
      const query = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(query);
      res.send({ verified: user?.verified === "verified" });
    });

    //get all sellers
    app.get("/getuser", verifyJWT, verifyAdmin, async (req, res) => {
      const reqrole = req.query.role;
      const query = {
        role: reqrole,
      };
      const result = await userCollections.find(query).toArray();
      res.send(result);
    });

    //get blog
    app.get("/blogs", async (req, res) => {
      const query = {};
      const result = await blogCollections.find(query).toArray();
      res.send(result);
    });

    //add product
    app.post("/product", verifyJWT, verifySeller, async (req, res) => {
      const newProduct = req.body;
      const result = await productCollections.insertOne(newProduct);
      res.send(result);
    });

    //get product for specific seller
    app.get("/sellerProduct", async (req, res) => {
      const queryEmail = req.query.email;
      const query = {
        sellerEmail: queryEmail,
      };
      const result = await productCollections.find(query).toArray();
      res.send(result);
    });

    // get jwt token
    app.get("/jwT", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const user = await userCollections.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "6h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
  } finally {
  }
}
run().catch(console.log);
