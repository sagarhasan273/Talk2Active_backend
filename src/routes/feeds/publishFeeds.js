const express = require('express');

const router = express.Router();

router.post('/quote', async (res, req) => {
    const data = req.body();
    console.log(data);
    try{

        res.json({ status: true, message: 'Puplished successfully!' })
    }catch (err) {
        res.json({ status: false, message: err})
    }
})

module.exports = router;