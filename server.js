require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all public assets
app.use(express.static('public'));

// Serve businesses folder with CORS headers
app.use('/businesses', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'public', 'businesses')));

// Endpoint to get the last business number
app.get('/latest-business-id', (req, res) => {
  const dir = path.join(__dirname, 'public', 'businesses');
  
  if (!fs.existsSync(dir)) {
    return res.json({ lastNumber: 0 });
  }

  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  
  let maxNumber = 0;

  files.forEach(file => {
    const id = path.basename(file, '.json');
    const num = parseInt(id.slice(3), 10);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  });

  res.json({ lastNumber: maxNumber });
});

// Endpoint to fetch business JSON with explicit headers (optional alternative)

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
