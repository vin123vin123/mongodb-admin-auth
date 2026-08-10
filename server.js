import express from 'express';
import session from 'express-session';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-fallback-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 2. Protection Middleware
function checkAuthentication(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized access. Please log in." });
}

// 3. Password Auth Routes
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'password123';

    if (username === adminUser && password === adminPass) {
        req.session.isAdmin = true;
        req.session.username = username;
        return res.json({ success: true });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.json({ loggedIn: true, user: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// 4. Database Connection Engine
let db;
const client = new MongoClient(process.env.MONGO_URI);
async function connectDB() {
    try {
        await client.connect();
        db = client.db('myDatabaseName').collection('myCollectionName');
        console.log("🚀 Connected cleanly to MongoDB Cluster!");
    } catch (err) {
        console.error("❌ MongoDB connection failure:", err);
    }
}
connectDB();

// 5. Protected Core Database APIs
app.get('/api/data', checkAuthentication, async (req, res) => {
    const data = await db.find({}).toArray();
    res.json(data);
});

app.post('/api/data', checkAuthentication, async (req, res) => {
    const result = await db.insertOne(req.body);
    res.json(result);
});

app.delete('/api/data/:id', checkAuthentication, async (req, res) => {
    const result = await db.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
});

// Explicit Static Asset Routing to protect layout views
app.get('/admin.html', (req, res) => {
    if (!req.session || !req.session.isAdmin) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));

app.listen(PORT, () => console.log(`💻 Administration portal running on port ${PORT}`));
