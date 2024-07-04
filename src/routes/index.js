const express = require('express');
const User = require('../models/User');

const router = express.Router();
const jwt = require('../Utils/jwtUtils');

router.get('/', async (req, res) => {
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id).select('-password');
        return res.json(user);
    } catch (err) {
        console.error(err.message);
        return res.status(401).json({ message: 'Token is not valid.' });
    }
});
router.use('/auth', require('./authentication'));

module.exports = router;