const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');


// Register Route
router.post('/register', async (req, res) => {
    const {name, email, password} = req.body;
console.log(req.body);
    try{
        let user = await User.findOne({email});
        if (user){
            return res.status(400).json({message: "User already exists"});
        }

        // Create New User
        user = new User({
            name,
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
                id: user.id
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '5h'});

        res.status(201).json({token})
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    try{
        let user = await User.findOne({email});

        if (!user){
            return res.status(400).json({message: 'Invalid credentials!'});
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch){
            return res.status(400).json({message: 'Invalid credentials!'});
        }

        // Generate JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '5h'});

        res.json({token});
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
})

module.exports = router;