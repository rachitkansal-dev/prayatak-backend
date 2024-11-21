const express = require('express');
const router = express.Router();
require('dotenv').config();
const User = require('../models/user');
const { Comment, Blog } = require('../models/blog');
const { validate, upload } = require('../middleware');

// Get all blogs or search by title
router.get('/', async (req, res) => {
    try {
        const q = req.query.q;
        let posts;
        if (q) {
            posts = await Blog.find({ place: { $regex: q, $options: 'i' } }).sort({ likes: -1 })
        } else {
            posts = await Blog.find({}).sort({ likes: -1 })
        }
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching blog posts." });
    }
});

// View single blog post
router.get('/:id', async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id).populate('comments');
        if (!post) {
            return res.json(null);
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Server error while fetching the blog post." });
    }
});

// Create a blog post with image upload
router.post('/create', validate, upload.single('image'), async (req, res) => {
    try {
        const data = req.body;
        const post = new Blog({
            title: data.title,
            place: data.place,
            body: data.body,
            image: req.file ? req.file.path : `/default.png`,
            author: data.author, 
            author_id: req.session.user_id,
        });
        
        await post.save();

        const user = await User.findById(req.session.user_id);
        user.blogs.push(post);
        await user.save();

        res.status(201).json({ message: 'Blog post created successfully', post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while creating the blog post." });
    }
});


// Edit a blog post
router.post('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found." });
        }
        if(!(req.session.isAdmin || (post.author_id.toString() === req.session.user_id))){
            return res.status(403).json({ error: "You are not authorized to edit this post." });
        }

        const updatedData = req.body;
        post.title = updatedData.title || post.title;
        post.body = updatedData.body || post.body;
        if (req.file) {
            post.image = req.file.path;
        }
        await post.save();
        res.json({ message: 'Blog post updated successfully', post });
    } catch (error) {
        res.status(500).json({ error: "Server error while updating the blog post." });
    }
});

// Delete a blog post
router.delete('/:id', validate, async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found." });
        }
        if (!(req.session.isAdmin || (post.author_id.toString() === req.session.user_id))) {
            return res.status(403).json({ error: "You are not authorized to delete this post." });
        }
        const comments = await Comment.find({ parent_blog: post._id });
        for (const comment of comments) {
            await User.updateOne(
                { _id: comment.user_id },
                { $pull: { comments: comment._id } }
            );
        }
        await Comment.deleteMany({ parent_blog: post._id });

        const user = await User.findById(post.author_id);
        user.blogs = user.blogs.filter(blogId => blogId.toString() !== req.params.id);
        await user.save();

        await Blog.findByIdAndDelete(req.params.id);

        res.json({ message: 'Blog post and associated comments deleted successfully' });
    } catch (error) {
        console.log('Error in delete:', error);
        res.status(500).json({ error: "Server error while deleting the blog post." });
    }
});



// Post a comment on a blog post
router.post('/:id/comment', validate, async (req, res) => {
    try {
        const data = {
            body: req.body.comment,
            username: req.session.name,
            user_id: req.session.user_id,
            parent_blog: req.params.id
        };
        const comment = new Comment(data);
        const post = await Blog.findById(req.params.id);
        const user = await User.findById(req.session.user_id);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found." });
        }
        post.comments.push(comment);
        user.comments.push(comment);
        await comment.save();
        await post.save();
        await user.save();
        res.status(201).json({ message: 'Comment added successfully', comment });
    } catch (error) {
        res.status(500).json({ error: "Server error while posting the comment." });
    }
});

// Delete a comment
router.delete('/:id/comment/:c_id', validate, async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found." });
        }
        const user = await User.findById(req.session.user_id);
        const comment = await Comment.findById(req.params.c_id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }
        if (!(req.session.isAdmin || (comment.user_id.toString() === req.session.user_id))) {
            return res.status(403).json({ error: "You are not authorized to delete this comment." });
        }
        post.comments = post.comments.filter(c => c.toString() !== req.params.c_id);
        user.comments = user.comments.filter(c => c.toString() !== req.params.c_id);
        await Comment.findByIdAndDelete(req.params.c_id);

        await post.save();
        await user.save();

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.log('Error deleting comment:', error);
        res.status(500).json({ error: "Server error while deleting the comment." });
    }
});

// Like a blog post
router.post('/:id/like', validate, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (blog.likedBy.includes(req.session.user_id)) {
            return res.status(400).json({ error: "You have already upvoted this blog post." });
        }
        blog.likes += 1;
        blog.likedBy.push(req.session.user_id);
        await blog.save();
        res.json({ message: 'Blog post upvoted successfully', likes: blog.likes });
    } catch (e) {
        res.status(500).json({ error: "Server error while upvoting the blog." });
    }
});

// Dislike a blog post
router.post('/:id/dislike', validate, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        const userId = req.session.user_id;
        const userIndex = blog.likedBy.indexOf(userId);
        if (userIndex === -1) {
            return res.status(400).json({ error: "You have not upvoted this blog post." });
        }
        blog.likes -= 1;
        blog.likedBy.splice(userIndex, 1);
        await blog.save();
        res.json({ message: 'Blog post downvoted successfully', likes: blog.likes });
    } catch (e) {
        res.status(500).json({ error: "Server error while downvoting the blog." });
    }
});

// Like a comment
router.post('/comment/:c_id/like', validate, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.c_id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }
        if (comment.likedBy.includes(req.session.user_id)) {
            return res.status(400).json({ error: "You have already liked this comment." });
        }
        comment.likes += 1;
        comment.likedBy.push(req.session.user_id);
        await comment.save();
        res.json({ message: 'Comment liked successfully', likes: comment.likes });
    } catch (e) {
        res.status(500).json({ error: "Server error while liking the comment." });
    }
});

// Dislike a comment
router.post('/comment/:c_id/dislike', validate, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.c_id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found." });
        }
        const userId = req.session.user_id;
        const userIndex = comment.likedBy.indexOf(userId);
        if (userIndex === -1) {
            return res.status(400).json({ error: "You have not liked this comment." });
        }
        comment.likes -= 1;
        comment.likedBy.splice(userIndex, 1);
        await comment.save();
        res.json({ message: 'Comment unliked successfully', likes: comment.likes });
    } catch (e) {
        res.status(500).json({ error: "Server error while unliking the comment." });
    }
});

module.exports = router;