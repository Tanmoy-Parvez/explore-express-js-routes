const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// database url client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@manufacturer-website.ex4nj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




// verify function for jwt
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Access Forbidden' });
        }
        req.decoded = decoded;
        next();
    });

}


const run = async () => {
    try {
        await client.connect();
        console.log('database connected');

        // collections
        const userCollection = client.db('manufacturer-db').collection('users');
        const productCollection = client.db('manufacturer-db').collection('products');
        const reviewCollection = client.db('manufacturer-db').collection('reviews');
        const orderCollection = client.db('manufacturer-db').collection('orders');
        const paymentCollection = client.db('manufacturer-db').collection('payments');

        // verify admin from database
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            const role = requesterAccount.role;
            if (role === 'admin') {
                next()
            } else {
                res.status(403).send({ message: 'forbidden access' })
            }
        }

        // PAYMENT API FOR STRIPE
        app.post("/create-payment-intent", verifyToken, async (req, res) => {
            const order = req.body;
            const price = order?.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // USERS API 
        // login user api to create token and update user database
        app.put('/user/:email', async (req, res) => {
            const user = req.body
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ token });
        })

        app.put('/user/update/:email', verifyToken, async (req, res) => {
            const profile = req.body
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: profile
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        app.put('/user/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const update = req.body;
            const filter = { email: email };
            const updatedDoc = {
                $set: update
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send({ result });

        })

        app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email: email });
            res.send(result);
        });
        app.delete('/user/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.deleteOne({ email: email });
            res.send(result);
        });



        // PRODUCT API
        app.get('/product', async (req, res) => {
            const limit = Number(req.query?.limit);
            if (limit) {
                const products = ((await productCollection.find().toArray()).reverse()).slice(0, limit);
                res.send(products);
            } else {
                const products = (await productCollection.find().toArray()).reverse();
                res.send(products);
            }
        })
        app.get('/product/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const product = await productCollection.findOne(filter);
            res.send(product);
        })

        app.post('/product', verifyToken, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const newUpdate = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: newUpdate.quantity
                }
            };
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result)
        })


        // REVIEW API 
        app.get('/review', async (req, res) => {
            const reviews = (await reviewCollection.find().toArray()).reverse();
            res.send(reviews);
        })
        app.post('/review', verifyToken, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // ORDER API


        app.get('/order', verifyToken, async (req, res) => {
            const email = req.query?.email;
            if (email) {
                const filter = { email: email }
                const orders = (await orderCollection.find(filter).toArray()).reverse();
                res.send(orders);
            } else {
                const orders = (await orderCollection.find().toArray()).reverse();
                res.send(orders);
            }
        })
        app.get('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const order = await orderCollection.findOne({ _id: ObjectId(id) });
            res.send(order);
        })

        app.put('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'pending',
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        })

        app.put('/order/accept/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: data.status
                }
            }
            const result = await orderCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })


        app.post('/order', verifyToken, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.delete('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })

    } finally {

    }



}
run().catch(console.dir)




app.get('/', (req, res) => {
    res.send("server running");
});


app.listen(port, () => console.log('server running on port: ', port))