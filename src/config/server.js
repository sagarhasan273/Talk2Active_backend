const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(bodyParser.json());

// Routes
app.use('/', require('../routes'));

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))