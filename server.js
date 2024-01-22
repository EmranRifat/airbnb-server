const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { JsonWebTokenError } = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.z9eijhl.mongodb.net/?retryWrites=true&w=majority`;

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
    const homesCollection = client.db("aircncdb").collection("homes");
    const usersCollection = client.db("aircncdb").collection("users");
    const bookingsCollection = client.db("aircncdb").collection("bookings");


//  // Verify Admin
// const verifyAdmin = async (req, res, next) => {
//   const decodedEmail = req.decoded?.email;

//   if (!decodedEmail) {
//     return res.status(403).send({ message: 'forbidden access' });
//   }

//   const query = { email: decodedEmail };
//   const user = await usersCollection.findOne(query);

//   if (user?.role !== 'admin') {
//     return res.status(403).send({ message: 'forbidden access' });
//   }

//   console.log('Admin true');
//   next();
// };




//     // Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = authHeader.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, 
    function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded
    next()
  })
}

    //save user email & generate JWT
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const Token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ result, Token });
    });

    // get alll Homes
    app.get("/homes",  async (req, res) => {
      const query = {};
      const result = await homesCollection.find(query).toArray();
      res.send(result);
    });

    // Get All Homes for host
    app.get("/homes/:email", async (req, res) => {
      const email = req.params.email;
      // const decodedEmail = req.decoded?.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      const query = {
        "host.email": email,
      };
      const cursor = homesCollection.find(query);
      const homes = await cursor.toArray();
      res.send(homes);
    });


    // get single home by id
    app.get("/home/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const home = await homesCollection.findOne(query);
      res.send(home);
    });


    // add a home
    app.post("/homes", async (req, res) => {
      const homes = req.body;
      const result = await homesCollection.insertOne(homes);
      res.send(result);
    });
    
    // Delete a home 
app.delete("/home/:id", async(req,res)=>{ 
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const result=await homesCollection.deleteOne(query);
  res.send(result)

});
  // Update A Home
  app.put('/homes', async (req, res) => {
    const home = req.body
    console.log(home)

    const filter = {}
    const options = { upsert: true }
    const updateDoc = {
      $set: home,
    }
    const result = await homesCollection.updateOne(filter, updateDoc, options)
    res.send(result)
  })

   // Get search result
   app.get('/search-result', async (req, res) => {
    const query = {}
    const location = req.query.location
    if (location) query.location = location
    const cursor = homesCollection.find(query)
    const homes = await cursor.toArray()
    res.send(homes)
  })


    // save a bookings db
    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    });

    // get all bokings
    app.get("/bookings", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = {
          guestEmail: email,
        };
      }
      const booking = await bookingsCollection.find(query).toArray();
      // console .log(booking);
      res.send(booking);
    });

    // delete booking
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingsCollection.deleteOne(query);
      res.send(booking);
    });

    // get single user by email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      res.send(user);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      const amount = parseFloat(price) * 100;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        console.log(err);
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("airbnb server is running....");
});

app.listen(port, () => {
  console.log(`airbnb server is running on port ${port}`);
});
