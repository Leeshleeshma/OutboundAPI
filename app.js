require('dotenv').config(); // <-- Load env variables
 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
 
const app = express();
const port = process.env.PORT || 3000;
 
// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
 
// Middleware
app.use(cors());
app.use(bodyParser.json());
 
async function connectDB() {
    await client.connect();
    console.log('Connected to MongoDB');
}
 
const database = client.db('accountDB');
const accounts = database.collection('account');
 
// Routes
 
// GET all accounts
app.get('/accounts', async(req, res) => {
    const allAccounts = await accounts.find().toArray();
    res.json(allAccounts);
});
 
// GET single account by _id
app.get('/accounts/:id', async(req, res) => {
    const id = req.params.id;
    const account = await accounts.findOne({ _id: new ObjectId(id) });
    res.json(account);
});
 
// POST create new account (supporting Salesforce Id)
app.post('/accounts', async(req, res) => {
    const { Name, Phone, PersonEmail, Fax, AccountId__c } = req.body;

    if (!Name || !Phone || !PersonEmail || !Fax) {
        return res.status(400).send('Missing required fields');
    }

    const accountDocument = {
        Name,
        Phone,
        PersonEmail,
        Fax,
        ...(AccountId__c && { AccountId__c })
    };

    const result = await accounts.insertOne(accountDocument);
    res.json({ insertedId: result.insertedId });
});

 
// INSERT via GET with URL query parameters
app.get('/insertAccount', async(req, res) => {
    const { Name, Phone, PersonEmail, Fax, AccountId__c } = req.query;

    if (!Name || !Phone || !PersonEmail || !Fax) {
        return res.status(400).send('Missing required fields');
    }

    const accountDocument = {
        Name,
        Phone,
        PersonEmail,
        Fax,
        ...(AccountId__c && { AccountId__c })
    };

    const result = await accounts.insertOne(accountDocument);
    res.send(`Inserted account with ID: ${result.insertedId}`);
});

 
// ✅ NEW: PUT update account by Salesforce Id
app.put('/updateAccount', async (req, res) => {
    const accountId = req.query.accountId; // corresponds to AccountId__c
    const { Name, Phone, PersonEmail, Fax } = req.query;

    if (!accountId) {
        return res.status(400).send('Missing AccountId__c (accountId)');
    }

    const updatedData = {
        ...(Name && { Name }),
        ...(Phone && { Phone }),
        ...(PersonEmail && { PersonEmail }),
        ...(Fax && { Fax })
    };

    const result = await accounts.updateOne(
        { AccountId__c: accountId },
        { $set: updatedData }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send('No record found with this AccountId__c');
    }

    res.json({ modifiedCount: result.modifiedCount });
});

 
// Start server
app.listen(port, async() => {
    await connectDB();
    console.log(`Server running on http://localhost:${port}`);
});