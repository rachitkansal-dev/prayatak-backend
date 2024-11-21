const mongoose = require("mongoose"); 

const ContactUsSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  });
  
  // Create the model
  const ContactUs = mongoose.model('ContactUs', ContactUsSchema);

module.exports = ContactUs;

