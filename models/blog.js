const mongoose = require("mongoose"); 

const commentSchema = new mongoose.Schema({
    body: {
        type: String,
        required: true
    },
    likes: {
        type: Number,
        default: 0
    },
    username: {
        type: String,
        required: true
    },
    likedBy: [ 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    parent_blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'
    }
});

const Comment = mongoose.model('Comment', commentSchema);

const commentSchemalf = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true 
    },
    commentText: {
        type: String,
        required: true,
        trim: true 
    },
});

const Commentlf = mongoose.model('Commentlf', commentSchemalf);

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    place: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    likes: {
        type: Number,
        default: 0
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment' 
        }
    ],
    likedBy: [ 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    author: {
        type: String,
        required: true
    },
    author_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
    },
    image: {
        type: String,
        required: false,
    }
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = {Comment, Blog,Commentlf};