/**
 * Vercel Serverless Function - Image Proxy
 * Proxies HTTP images to avoid Mixed Content errors
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Decode the URL
        const targetUrl = decodeURIComponent(url);

        // Validate it's an image URL (basic check)
        const urlObj = new URL(targetUrl);

        // Make the request to the target URL
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Player/1.0)',
                'Accept': 'image/*,*/*'
            }
        });

        if (!response.ok) {
            return res.status(response.status).end();
        }

        // Get the content type
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Get the image data
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800'); // Cache for 1 day client, 7 days server
        res.setHeader('X-Content-Type-Options', 'nosniff');

        return res.status(200).send(buffer);
    } catch (error) {
        console.error('Image proxy error:', error);
        return res.status(500).end();
    }
}
