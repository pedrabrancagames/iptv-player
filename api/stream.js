/**
 * Vercel Serverless Function - Video Stream Proxy
 * Proxies HTTP video streams to avoid Mixed Content errors
 */

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Decode the URL
        const targetUrl = decodeURIComponent(url);

        console.log('Streaming:', targetUrl);

        // Build headers for the upstream request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Player/1.0)',
        };

        // Forward Range header for seeking support
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Make the request to the video URL
        const response = await fetch(targetUrl, {
            method: req.method,
            headers
        });

        if (!response.ok && response.status !== 206) {
            console.error('Upstream error:', response.status, response.statusText);
            return res.status(response.status).send(`Upstream error: ${response.status}`);
        }

        // Set response headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        // Forward content headers
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');

        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

        // Set status code
        res.status(response.status);

        // Stream the response body
        const reader = response.body.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        } catch (streamError) {
            console.error('Stream error:', streamError);
            // Client might have disconnected, that's okay
            res.end();
        }

    } catch (error) {
        console.error('Stream proxy error:', error);
        return res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
}

// Configure as streaming function
export const config = {
    api: {
        responseLimit: false,
        bodyParser: false,
    },
};
