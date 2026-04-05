import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary securely from Vercel env.
// Example Env: CLOUDINARY_URL=cloudinary://my_key:my_secret@my_cloud_name
// Or explicitly defined vars:
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

  const { fileData, fileType } = req.body;

  if (!fileData) {
    return res.status(400).json({ error: 'No file data provided' });
  }

  try {
    // Determine the general resource type (image, video, raw)
    let resourceType = 'auto';
    if (fileType.startsWith('application/') || fileType.startsWith('text/')) {
       resourceType = 'raw';
    }

    // Upload base64 encoded payload to Cloudinary securely
    const uploadResult = await cloudinary.uploader.upload(fileData, {
      resource_type: resourceType,
      folder: 'synapse_messenger',
      // If client wants unsigned fallback specifically, we can use an upload_preset here,
      // but Serverless allows signed uploads effortlessly via configuration above!
    });

    return res.status(200).json({
      secure_url: uploadResult.secure_url,
      format: uploadResult.format || 'raw',
      resource_type: uploadResult.resource_type
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return res.status(500).json({ error: 'Failed to upload media to Cloudinary' });
  }
}
