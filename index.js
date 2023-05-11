const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// user:dbuser
// pass: NST3rix22TxnNnOo

// Database Connection
const uri = `mongodb+srv://dbuser:${process.env.DB_PASS}@cluster0.z9eijhl.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


// Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) { 
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = authHeader.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    console.log(decoded)
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    const homesCollection = client.db("aircncdb").collection("homes");
    const usersCollection = client.db("aircncdb").collection("users");
    const bookingsCollection = client.db("aircncdb").collection("bookings");



    //save user email & generate JWT
    app.put("/user/:email",verifyJWT, async (req, res) => {
      const user = req.body;
      const email = req.params.email;
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
      //  console.log(rfesult);


      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "12h",
      });
      res.send({ result, token });
    });

    // booking save on DB
    app.post("/booking",verifyJWT, async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      console.log(result);
      res.send(result);
    });

    // add homes
    app.post("/homes", async (req, res) => {
      const homes = req.body;
      const result = await homesCollection.insertOne(homes);
      console.log(result);
      res.send(result);
    });

    // get all homes  //
    app.get("/homes", async (req, res) => {
      const query = {};
      const result = await homesCollection.find(query).toArray();
      res.send(result);
    });


    // get single home
    app.get("/homes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) };
      const home = await homesCollection.findOne(query);
      res.send(home);
    });
    
    

// Get All Homes for host
app.get('/home/:email', async (req, res) => {
  const email = req.params.email
  // const decodedEmail = req.decoded.email
// console.log(email);
  // if (email !== decodedEmail) {
  //   return res.status(403).send({ message: 'forbidden access' })
  // }
  const query = {
    'host.email': email,
  }
  const cursor = homesCollection.find(query)
  const homes = await cursor.toArray()
  res.send(homes)
})

// Delete a home
app.delete('/home/:id',verifyJWT, async (req, res) => {
  const id = req.params.id
  const query = { _id:new ObjectId(id) }
  const result = await homesCollection.deleteOne(query)
  res.send(result)
  
})

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

    console.log(query)
    const cursor = homesCollection.find(query)
    const homes = await cursor.toArray()
    res.send(homes)
  })


    // get all bookings
    app.get("/bookings", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { guestEmail: email };
      }
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking);
    });


    // Get a single booking
    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });


    // delete booking
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) };
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



      // app.post("/create-payment-intent", async (req, res) => {
      //   const price = req.body.price;
      //   console.log(price);
      //   const amount=parseFloat(price)*100;


      //   try {
      //     const paymentIntent = await stripe.paymentIntents.create({
      //       amount: amount,
      //       currency: 'usd',
      //       payment_method_types: ['card'],
      //     })
      //     res.send({ clientSecret: paymentIntent.client_secret })
      //   } catch (err) {
      //     console.log(err)
      //   }

      // });





    });
  
  
  
  
  } finally {
  
  
  }
}

run()
.catch((err) => console.error(err));



app.get("/", (req, res) => {
  res.send("Server is running...");
});


app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
