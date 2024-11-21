const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Middleware to check if the user is logged in
function validate(req, res, next) {
    if (!req.session.isLogin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
}

function validateAdmin(req, res, next) {
    if (!req.session.isAdmin) {
        return res.status(401).json({ message: 'not admin' });
    }
    next();
}

// Set up email transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.TRANSPORTER_EMAIL,
        pass: process.env.TRANSPORTER_KEY,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to mail server:', error);
    } else {
        console.log('Connected to mail server successfully');
    }
});

// Set up Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads',
        allowed_formats: ['png', 'jpeg', 'gif'], 
    },
});

// Initialize multer with Cloudinary storage
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Images Only!')); 
        }
    },
});

function checkCloudinaryConnection() {
    cloudinary.api.ping((error, result) => {
        if (error) {
            console.error('Cloudinary connection failed:', error.message);
        } else {
            console.log('Cloudinary connected successfully:');
        }
    });
}

// Export middleware
module.exports = { validate, upload, transporter, checkCloudinaryConnection, validateAdmin };