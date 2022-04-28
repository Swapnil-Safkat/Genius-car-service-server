const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const {MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req,res,next)=>{
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.send(401).send({ message: 'unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'forbidden access' })
    req.decoded = decoded;
    next();
  })
};

app.get('/', (req, res) => res.send('Connected with genius car service'));

const uri = `mongodb+srv://${
  process.env.DB_USER
}:${
  process.env.DB_PASS
}@learningmongo.qf50z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('GeniusCarService').collection('Services');
    const orderCollection = client.db('GeniusCarService').collection('Orders');
  
    //user login token
    app.post('/login', async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
      res.send(accessToken);
    });
    
    // get orders of a single user
    app.get('/orders',verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const cursor = orderCollection.find({email:email});
        const result = await cursor.toArray();
        res.send(result);
      }else res.status(403).send({ message: 'forbidden access' })
    });

    // get all the services
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find({});
      const services = await cursor.toArray();
      res.send(services);
    });

    // get a single service from id
    app.get('/services/:id', async (req, res) => {
      const query = {
        _id: ObjectId(req.params.id)
      };
      const service = await serviceCollection.findOne(query);
      res.send(service);

      // add a new service to mongo
      app.post('/services', async (req, res) => {
        const newService = req.body;
        const result = await serviceCollection.insertOne(newService);
        res.send(result);
      });

      // delete a service
      app.delete('/services', async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: ObjectId(id)
        };
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      });

    
      // place a order
      app.post('/orders', async (req, res) => {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
      });
    });
  } finally {}
}
run().catch(console.dir);


app.listen(port, () => console.log('Listening to port ', port));
