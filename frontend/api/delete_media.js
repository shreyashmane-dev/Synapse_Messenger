import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { publicId, resourceType = 'image' } = req.body;

  if (!publicId) {
    return res.status(400).json({ error: 'Public ID is required' });
  }

  try {
     const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType === 'raw' ? 'raw' : 'image' });
     return res.status(200).json({ result: result.result });
  } catch (error) {
     console.error('Cloudinary Deletion Error:', error);
     return res.status(500).json({ error: 'Failed to destroy media' });
  }
}
