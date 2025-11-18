// Vercel Serverless Function to upload image to ImgBB
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
        
        // Upload to ImgBB using fetch with form-urlencoded
        const params = new URLSearchParams();
        params.append('key', 'd36eb6591370ae7f9089d85875e56b22');
        params.append('image', image);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ImgBB error:', response.status, errorText);
            throw new Error(`ImgBB returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.url) {
            return res.status(200).json({
                success: true,
                url: data.data.url,
                delete_url: data.data.delete_url
            });
        } else {
            throw new Error('Invalid response from ImgBB');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Upload failed'
        });
    }
}
