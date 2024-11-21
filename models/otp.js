const mongoose = require("mongoose"); 

const OTPSchema = new mongoose.Schema({
    OTP: {
        type : String,
        required : true,
    },
    OTPToken : {
        type : String,
        required : true,
    },
    OTPExpires : {
        type : Date,
        required : true,
    },
    data : {
        type : String,
        required : true,
    }
});

const OTP = mongoose.model('OTP', OTPSchema);

module.exports = OTP;

