const express = require('express');
const router = express.Router();
const { validate, transporter, validateAdmin } = require('../middleware');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { promisify } = require("util");
require('dotenv').config();
const User = require('../models/user');
const OTP = require('../models/otp');
const { Item, Item2 } = require('../models/item');
const { Comment, Blog } = require('../models/blog');
const ContactUs = require('../models/contactus'); 


router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        req.session.name = user.name;
        req.session.email = user.email;
        req.session.user_id = user._id;
        req.session.phoneNumber= user.phoneNumber;
        req.session.address= user.address;
        req.session.isLogin = true;
        req.session.isAdmin = user.isAdmin;
        res.json({ message: 'Login successful', user: { _id:user._id,name: user.name, email: user.email , phoneNumber: user.phoneNumber, address : user.address, isAdmin : user.isAdmin} });
    } catch (e) {
        console.log('Error in login:', e);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

router.post('/signup', async (req, res) => {
    try {
        if (await User.findOne({ email: req.body.email })) {
            return res.status(400).json({ message: 'User already registered' });
        }
        req.body.password = await bcrypt.hash(req.body.password, 12);

        const token = (await promisify(crypto.randomBytes)(20)).toString('hex');
        const expiration = Date.now() + 3600000;
        const userOTP = Math.floor(1000 + Math.random() * 9000);
        const otp = new OTP({
            OTP : userOTP,
            OTPToken : token,
            OTPExpires : expiration,
            data : JSON.stringify(req.body),
        })
        await otp.save();
        await transporter.sendMail({
            to: req.body.email,
            subject: "OTP for verification",
            text: `OTP for account verification is ${userOTP} .`
        });

        res.status(200).json({message : "otp for email verification sent to your email", token : token});
    } catch (e) {
        console.log('Error in signup:', e);
        res.status(500).json({ message: 'Error signing up.' });
    }
});

router.post('/otp-check/:token', async (req,res) => {
    try {
        const otp = await OTP.findOne({
            OTPToken: req.params.token,
            OTPExpires: { $gt: Date.now() },
        });
        if(req.body.OTP == otp.OTP){
            const user = new User(JSON.parse(otp.data));
            await user.save();
            req.session.name = user.name;
            req.session.email = user.email;
            req.session.user_id = user._id;
            req.session.phoneNumber= user.phoneNumber;
            req.session.address= user.address;
            req.session.isLogin = true;
            await OTP.findByIdAndDelete(otp._id);
            res.json({ message: 'Signup successful', user: {_id:user._id, name: user.name, email: user.email , phoneNumber: user.phoneNumber, address : user.address} });
        }
        else{
            res.status(500).json({message: "wrong otp"});
        }
    }
    catch (e) {
        console.log('Error in otp:', e);
        res.status(500).json({ message: 'Error in otp.' });
    }
})

router.get('/profile', validate, (req, res) => {
    if (!req.session.isLogin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json({
        user_id: req.session.user_id,
        name: req.session.name,
        email: req.session.email,
        phoneNumber: req.session.phoneNumber,
        address: req.session.address,
    });
});

router.get('/profile/:id', validate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            user_id: req.params.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            address: user.address,
        });
    } catch (e) {
        console.log("Error in getting profile:", e);
        res.status(500).json({ message: 'Error in getting profile.' });
    }
});

router.post('/profile/:id', validate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.send("No such user present");
        }
        req.body.password = req.body.password
            ? await bcrypt.hash(req.body.password, 12)
            : user.password;
        await User.findByIdAndUpdate(req.params.id, {
            name: req.body.name || user.name,
            password: req.body.password,
            phoneNumber: req.body.phoneNumber || user.phoneNumber,
            address : req.body.address || user.address,
        }, { new: true });
        req.session.name = req.body.name || user.name;
        req.session.phoneNumber= user.phoneNumber || user.phoneNumber;
        req.session.address= user.address || user.address;
        res.json({ message: 'Profile Updated successfully' });
    } catch (e) {
        console.log('Error in update:', e);
        res.status(500).send('Error updating profile.');
    }
});
  

router.delete('/profile/:id', validate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'No such user present' });
        }
        await Comment.deleteMany({ user_id: user._id });
        const blogs = await Blog.find({ author_id: user._id });
        const blogIds = blogs.map(blog => blog._id);
        await Comment.deleteMany({ parent_blog: { $in: blogIds } });
        await Blog.deleteMany({ author_id: user._id });
        await Item.deleteMany({ email :  user.email});        
        await Item2.deleteMany({ email : user.email});  
        await User.findByIdAndDelete(req.params.id);

        req.session.destroy();

        res.json({ message: 'Account and related data deleted successfully' });
    } catch (e) {
        console.log('Error in delete:', e);
        res.status(500).json({ message: 'Error deleting account and related data.' });
    }
});


router.post('/logout', validate, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out.' });
        }
        res.json({ message: 'Logout successful' });
    });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const token = (await promisify(crypto.randomBytes)(20)).toString('hex');
        const expiration = Date.now() + 3600000;
        await User.updateOne(
            { email: req.body.email },
            { $set: { resetPasswordToken: token, resetPasswordExpires: expiration } }
        );
        const resetLink = `http://localhost:3000/reset-password/${token}`;
        await transporter.sendMail({
            to: user.email,
            subject: "Password Reset",
            text: `You are receiving this because you (or someone else) requested a password reset. Click the link to reset: ${resetLink}`
        });
        res.json({ message: 'Reset link sent to your email' });
    } catch (e) {
        console.log("Error in forgot password:", e);
        res.status(500).json({ message: 'Error in forgot password.' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }
        const newPassword = await bcrypt.hash(req.body.password, 12);
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: newPassword },
                $unset: { resetPasswordToken: "", resetPasswordExpires: "" }
            }
        );
        res.json({ message: 'Password has been successfully reset' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'An error occurred while resetting the password' });
    }
});


router.post('/submit-contactus', async (req, res) => {
    try {
      const { name, email, phoneNumber, message } = req.body;
  
      if (!name || !email || !phoneNumber || !message) {
        return res.status(400).send('All fields are required');
      }
  
      
      const newContact = new ContactUs({ name, email, phoneNumber, message });
      await newContact.save();
  
      console.log( newContact);
      res.status(200).send('Form submitted successfully');
    } catch (err) {
      console.error('Error submitting form:', err);
      res.status(500).send('Error saving form submission');
    }
  });

router.get('/contactus',async(req,res)=>{
    try{
        const items = await ContactUs.find();
        res.status(200).json(items);
    }
    catch(error){
        console.log(error);
        res.status(500).json({ message: 'An error occurred with contact us' });
    }
})

router.delete('/contactus/:id', async (req,res) => {
    try{
        const item = await ContactUs.findByIdAndDelete(req.params.id);
        if(!item){
            res.status(500).json({message : "contact us report not available"});
        }
        res.status(200).json({message : "contact us report deleted"});
    }
    catch(error){
        console.log(error);
        res.status(500).json({ message: 'An error occurred with deleting contact us' });
    }
})

router.get('/profile/:id/blogs',async(req,res) => {
    try{
        const user = await User.findById(req.params.id).populate('blogs');
        res.status(200).json(user.blogs);
    }
    catch(e){
        console.log(e);
        res.status(500).json({ message: 'An error occurred with contact us' });
    }
})

router.get('/profile/:id/comments',async(req,res) => {
    try{
        const user = await User.findById(req.params.id)
        .populate({
            path: 'comments', 
            populate: {
                path: 'parent_blog', 
                select: 'title image', 
            },
        });
        res.status(200).json(user.comments);
    }
    catch(e){
        console.log(e);
        res.status(500).json({ message: 'An error occurred with contact us' });
    }
})  

router.get('/users', validateAdmin, async (req,res) => {
    try{
        const users = await User.find({});
        res.status(200).json(users);
    }
    catch(e){
        console.log(e);
        res.status(500).json({ message: 'An error occurred with users' });
    }
})

router.delete('/users/:id', validateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'No such user present' });
        }
        await Comment.deleteMany({ user_id: user._id });
        const blogs = await Blog.find({ author_id: user._id });
        const blogIds = blogs.map(blog => blog._id);
        await Comment.deleteMany({ parent_blog: { $in: blogIds } });
        await Blog.deleteMany({ author_id: user._id });
        await Item.deleteMany({ email :  user.email});        
        await Item2.deleteMany({ email : user.email});        
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'Account deleted successfully' });
    } catch (e) {
        console.log('Error in delete:', e);
        res.status(500).json({ message: 'Error deleting account.' });
    }
});

module.exports = router;