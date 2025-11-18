// Vercel Serverless Function to proxy image upload to Catbox.moe
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image data provided' });
        }
        
        // Convert base64 to buffer
        const buffer = Buffer.from(image, 'base64');
        
        // Create FormData for Catbox
        const FormData = require('form-data');
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: 'photo.png',
            contentType: 'image/png'
        });
        
        // Upload to Catbox via server (bypass CORS)
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Catbox returned ${response.status}`);
        }
        
        const imageUrl = await response.text();
        
        if (!imageUrl || !imageUrl.startsWith('https://')) {
            throw new Error('Invalid response from Catbox');
        }
        
        return res.status(200).json({
            success: true,
            url: imageUrl
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Upload failed'
        });
    }
}
