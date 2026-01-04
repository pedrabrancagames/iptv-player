/**
 * Vercel Serverless Function - Video Stream Proxy
 * Proxies HTTP video streams to avoid Mixed Content errors
 */

export default async function handler(req, res) {
    // Enable CORS for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Decode the URL
        const targetUrl = decodeURIComponent(url);
        let urlObj;
        try {
            urlObj = new URL(targetUrl);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        console.log('Streaming:', targetUrl);

        // Build headers for the upstream request
        // Mimic a real browser or VLC to avoid 403 Forbidden
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': urlObj.origin + '/'
        };

        // Forward Range header for seeking support
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Make the request to the video URL
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            redirect: 'follow'
        });

        if (!response.ok && response.status !== 206) {
            console.error('Upstream error:', response.status, response.statusText);
            // Return 502 instead of upstream error status to distinguish from Vercel errors
            return res.status(502).json({
                error: 'Upstream Error',
                upstreamStatus: response.status,
                upstreamStatusText: response.statusText,
                url: targetUrl
            });
        }

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
        if (!response.body) {
            throw new Error('No response body received');
        }

        // Use async iterator which works in modern Node.js
        // @ts-ignore
        for await (const chunk of response.body) {
            res.write(Buffer.from(chunk));
        }
        res.end();

    } catch (error) {
        console.error('Stream proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Proxy error',
                message: error.message
            });
        } else {
            res.end();
        }
    }
}

// Configure as streaming function
export const config = {
    api: {
        responseLimit: false,
        bodyParser: false,
    },
};
