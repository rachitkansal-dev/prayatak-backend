const mongoose = require("mongoose"); 

const userSchema = new mongoose.Schema({
    name: {
        type : String,
        required : true,
    },
    email: {
        type : String,
        required : true,
    },
    password: {
        type : String,
        required : true,
    },
    phoneNumber: {
        type : String,
        required : true,
    },
    address: {
        type : String,
        required : true,
    },
    isAdmin: {
        type : Boolean,
        default : false,
    },
    resetPasswordToken : String,
    resetPasswordExpires : Date,
    blogs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Blog' 
        }
    ],
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment' 
        }
    ],
});

const User = mongoose.model('User', userSchema);

module.exports = User;

