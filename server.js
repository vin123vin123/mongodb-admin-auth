import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-fallback-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 2. Initialize Passport Session Management
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 3. Configure Google Authentication Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = profile.emails[0].value;

    if (userEmail === adminEmail) {
        return done(null, profile);
    } else {
        return done(null, false, { message: 'Not an authorized admin' });
    }
}));

// 4. Protection Middleware
function checkAuthentication(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized access. Please log in." });
}

// 5. Auth Action Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/?error=unauthorized' }),
    (req, res) => {
        res.redirect('/admin.html');
    }
);

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ loggedIn: true, user: req.user.displayName });
    } else {
        res.json({ loggedIn: false });
    }
});

// 6. Database Connection Engine
let db;
const client = new MongoClient(process.env.MONGO_URI);
async function connectDB() {
    try {
        await client.connect();
        // Adjust strings below to target your specific db and collections
        db = client.db('myDatabaseName').collection('myCollectionName');
        console.log("🚀 Connected cleanly to MongoDB Cluster!");
    } catch (err) {
        console.error("❌ MongoDB connection failure:", err);
    }
}
connectDB();

// 7. Protected Core Database APIs
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
    if (!req.isAuthenticated()) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));

app.listen(PORT, () => console.log(`💻 Administration portal routing running on port ${PORT}`));
