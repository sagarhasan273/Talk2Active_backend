const express = require('express');
const jwt = require('../Utils/jwtUtils');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied!' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user._id).select('-password');
        return res.json({status: true, message: 'Welcome to Talk2Active.', data: { user }});
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid.' });
    }
});

router.use('/profile', require('./profile'));

module.exports = router;