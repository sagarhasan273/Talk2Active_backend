const express = require('express');
const User = require('../../models/User');

const router = express.Router();

router.post('/update', async (req, res) => {
    const { userId, activeStatus } = req.body;

    try{
        const result = await User.updateOne({ userId }, { $set: { activeStatus}});
        if (result?.matchedCount === 0){
            return res.json({ status: false, message: 'Unfortunately user not exist.' })
        }
        return res.json({ status: true, message: 'Status updated successfully!' })
    }catch (error){
        return res.status(401).json({ status: false, message: error });
    }
})

module.exports = router;