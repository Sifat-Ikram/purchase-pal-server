const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIP_ACCOUNT);
const port = process.env.POST || 4321;

// middle wear
app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => {
  // console.log("inside middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Access forbidden" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Access forbidden" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jrqljyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productCollection = client.db("purchasePal").collection("product");
    const categoryCollection = client
      .db("purchasePal")
      .collection("categories");
    const userCollection = client.db("purchasePal").collection("user");
    const cartCollection = client.db("purchasePal").collection("cart");
    const orderCollection = client.db("purchasePal").collection("order");
    const reviewCollection = client.db("purchasePal").collection("review");

    // middleware again

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Access forbidden" });
      }
      next();
    };

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = await jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user api
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Access Unauthorized" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.patch("/user/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: item.name,
          email: item.email,
          photoUrl: photoUrl,
          gender: item.gender,
          address: item.address,
          birthdate: item.birthdate,
          role: item.role,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // category api
    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // review api
    app.patch("/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          review: [
            {
              name: item.review.name,
              rating: item.review.rating,
              reviewText: item.review.reviewText,
            },
          ],
        },
      };

      const result = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.post("/review", async (req, res) => {
      const reviewItem = req.body;
      const result = await reviewCollection.insertOne(reviewItem);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // product api
    app.get("/product", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const productItem = req.body;
      const result = await productCollection.insertOne(productItem);
      res.send(result);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/product/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: item.name,
          price: parseFloat(item.price),
          category: item.category,
          serve_time: item.serve_time,
          recipe: item.recipe,
          image: item.image,
        },
      };

      const result = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //   order api
    app.post("/order", async (req, res) => {
      const orderedItem = req.body;
      const result = await orderCollection.insertOne(orderedItem);
      res.send(result);
    });

    app.get("/order", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/order/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { eventId: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    //   cart api
    app.post("/cart", async (req, res) => {
      const bookingItem = req.body;
      const result = await cartCollection.insertOne(bookingItem);
      res.send(result);
    });
    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const admin = req.query.admin;
      let query = {};

      if (email) {
        query.email = email;
      } else if (admin) {
        query.admin = admin;
      }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //   likes api
    app.post("/likes", async (req, res) => {
      const likesedItem = req.body;
      const result = await likesCollection.insertOne(likesedItem);
      res.send(result);
    });

    app.get("/likes", async (req, res) => {
      const result = await likesCollection.find().toArray();
      res.send(result);
    });

    // stripe payment api
    app.post("/checkout-session", async (req, res) => {
      const product = req.body;
      console.log(product);
      const lineItems = product.products.map((prod) => ({
        price_data: {
          currency: "USD",
          product_data: {
            name: prod.name,
          },
          unit_amount: prod.price * 100, // Convert price to cents
        },
        quantity: 1
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Corrected parameter name
        line_items: lineItems, // Corrected parameter name
        mode: "payment",
        success_url: "http://localhost:5173/success",
        cancel_url: "http://localhost:5173/cancel",
      });
      res.json({ id: session.id });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Purchase pal is running");
});

app.listen(port, () => {
  console.log(`Purchase pal is running on port: ${port}`);
});
