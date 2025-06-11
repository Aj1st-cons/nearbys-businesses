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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Serve businesses folder with CORS
app.use('/businesses', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'public', 'businesses')));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint: Get latest business ID
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

// Endpoint: Upload images + save data
app.post('/upload-images', upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'profile', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), async (req, res) => {
  try {
    const { businessId, password, name, category, address, email, contact } = req.body;
    const uploads = {};

    for (const field of ['cover', 'profile', 'background']) {
      if (req.files[field]) {
        const buffer = req.files[field][0].buffer;

        const uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: `businesses/${businessId}` },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );

          const readable = new Readable();
          readable.push(buffer);
          readable.push(null);
          readable.pipe(stream);
        });

        uploads[field] = await uploadPromise;
      }
    }

    const dirPath = path.join(__dirname, 'public', 'businesses');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const jsonData = {
      businessId,
      password,
      name,
      category,
      address,
      email,
      contact,
      ...uploads
    };

    fs.writeFileSync(path.join(dirPath, `${businessId}.json`), JSON.stringify(jsonData, null, 2));

    res.json({ success: true, message: 'Business uploaded successfully.' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
