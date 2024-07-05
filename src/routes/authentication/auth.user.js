const express = require('express');

const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('../../Utils/jwtUtils');
const User = require('../../models/User');

// Register Route
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: "User already exists" });
        }

        // Create New User
        user = new User({
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email,
            password
        });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save User
        await user.save();

        // Generate JWT
        const payload = {
            user: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.name,
                email: user.email
            }
        };

        console.log(user);

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

        return res.json({ data: { accessToken: token, user: payload.user }, status: true, message: 'Sign up Successful.' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        // Generate JWT
        const payload = {
            user: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.name,
                email: user.email
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

        return res.json({ data: { accessToken: token, user: payload.user }, status: true, message: 'Login Successful.' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
    }
});

module.exports = router;