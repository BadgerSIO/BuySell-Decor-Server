const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const bookingCollections = client.db("buySellDecor").collection("bookings");
    const paymentCollections = client.db("buySellDecor").collection("payments");
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
    //verify seller
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

    //make seller verified
    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const user = await userCollections.findOne(query);
      const vefiedStatus = user?.verified;

      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: !vefiedStatus,
        },
      };

      const result = await userCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      //update in products also
      const userEmail = user?.email;
      const productQuery = {
        sellerEmail: userEmail,
      };
      const updateSeller = {
        $set: {
          sellerVerified: !vefiedStatus,
        },
      };
      const productResult = await productCollections.updateMany(
        productQuery,
        updateSeller,
        options
      );
      res.send(result);
    });
    //check seller verified or not
    app.get("/user/sellerVerified/:email", async (req, res) => {
      const reqEmail = req.params.email;
      const query = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(query);
      res.send({ verified: user?.verified });
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

    //get all buyers
    app.get("/getbuyers", verifyJWT, verifyAdmin, async (req, res) => {
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

    //advert or dont advert
    app.put("/product/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const reqEmail = req.query.email;
      const query = {
        _id: ObjectId(id),
      };
      const queryProduct = await productCollections.findOne(query);
      const reqProductSellerEmail = queryProduct.sellerEmail;

      const checkRole = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(checkRole);
      if (reqEmail !== reqProductSellerEmail && user.role !== "admin") {
        return res.status(403).send({ message: "Access Forbidden !" });
      }
      const advertStatus = queryProduct.advert;
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advert: !advertStatus,
        },
      };
      const result = await productCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //reported product
    app.put("/reportProduct/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          reported: true,
        },
      };
      const result = await productCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //remove reported product status
    app.put("/releaseProduct/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          reported: false,
        },
      };
      const result = await productCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //get reported products
    app.get("/reportedProducts", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {
        reported: true,
      };
      const result = await productCollections.find(query).toArray();
      res.send(result);
    });

    //delete product
    app.delete("/product/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const reqEmail = req.query.email;
      const query = {
        _id: ObjectId(id),
      };
      const queryProduct = await productCollections.findOne(query);
      const reqProductSellerEmail = queryProduct.sellerEmail;
      const checkRole = {
        email: reqEmail,
      };
      const user = await userCollections.findOne(checkRole);
      if (reqEmail !== reqProductSellerEmail && user.role !== "admin") {
        return res.status(403).send({ message: "Access Forbidden !" });
      }
      const result = await productCollections.deleteOne(query);
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

    //get product for home page
    app.get("/productsAdvert", async (req, res) => {
      const query = {
        advert: true,
        sold: false,
      };
      const result = await productCollections.find(query).toArray();
      res.send(result);
    });

    //get product by category
    app.get("/productsByCategory/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        categoryId: id,
        sold: false,
      };
      const results = await productCollections.find(query).toArray();
      res.send(results);
    });

    //add bookings
    app.post("/booking", verifyJWT, async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollections.insertOne(newBooking);
      res.send(result);
    });

    //get bookings by user email
    app.get("/myBookings", verifyJWT, async (req, res) => {
      const customerEmail = req.query.email;
      const query = {
        customerEmail: customerEmail,
      };
      const result = await bookingCollections.find(query).toArray();
      res.send(result);
    });
    //get single booking
    app.get("/bookingPayment/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const result = await bookingCollections.findOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //save payment info
    app.post("/payment", verifyJWT, async (req, res) => {
      const paymentInfo = req.body;
      const bookingId = paymentInfo.bookingId;
      const productId = paymentInfo.productId;
      //update booking
      const querybooking = {
        _id: ObjectId(bookingId),
      };
      const options = { upsert: true };
      const updateDocBooking = {
        $set: {
          sold: true,
        },
      };
      const bookUpdate = await bookingCollections.updateOne(
        querybooking,
        updateDocBooking,
        options
      );
      // update product
      const queryProduct = {
        _id: ObjectId(productId),
      };
      const updateProductDoc = {
        $set: {
          sold: true,
        },
      };
      const productUpdate = await productCollections.updateOne(
        queryProduct,
        updateProductDoc,
        options
      );
      const result = await paymentCollections.insertOne(paymentInfo);
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
