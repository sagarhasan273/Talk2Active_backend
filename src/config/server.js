const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/', require('../routes'));

const {PORT} = process.env;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

