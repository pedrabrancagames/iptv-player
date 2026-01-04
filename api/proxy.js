/**
 * Vercel Serverless Function - IPTV API Proxy
 * Bypasses CORS and Mixed Content issues by proxying requests through the server
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Decode the URL
        const targetUrl = decodeURIComponent(url);

        // Validate URL to prevent abuse
        const allowedHosts = [
            '1fcpbqww8.vip',
            // Add other allowed IPTV hosts here
        ];

        const urlObj = new URL(targetUrl);
        const isAllowed = allowedHosts.some(host => urlObj.hostname.includes(host));

        if (!isAllowed) {
            return res.status(403).json({ error: 'Host not allowed' });
        }

        // Make the request to the target URL
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'IPTV-Player/1.0'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `Upstream error: ${response.status} ${response.statusText}` 
            });
        }

        const data = await response.json();
        
        // Cache the response for 5 minutes
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        
        return res.status(200).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ 
            error: 'Proxy request failed', 
            message: error.message 
        });
    }
}
