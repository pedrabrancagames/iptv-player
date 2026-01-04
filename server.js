const express = require('express');
const cors = require('cors');
const path = require('path');
const { networkInterfaces } = require('os');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Helper to get local IP
function getLocalIp() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Stream Proxy Logic (adapted from api/stream.js)
app.all('/api/stream', async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const targetUrl = decodeURIComponent(url);
        let urlObj;
        try {
            urlObj = new URL(targetUrl);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        console.log('Streaming:', targetUrl);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': urlObj.origin + '/'
        };

        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Use global fetch (Node 18+)
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            redirect: 'follow'
        });

        if (!response.ok && response.status !== 206) {
            console.error('Upstream error:', response.status, response.statusText);
            return res.status(502).json({
                error: 'Upstream Error',
                upstreamStatus: response.status,
                url: targetUrl
            });
        }

        // Forward headers
        const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
        forwardHeaders.forEach(h => {
            const val = response.headers.get(h);
            if (val) res.setHeader(h, val);
        });

        res.status(response.status);

        if (!response.body) throw new Error('No response body');

        // Pipe stream
        // Node's native fetch body is a ReadableStream (Web Streams API)
        // Express res is a Writable stream (Node Streams API)
        // We need to bridge them.

        // Ensure we handle Node version differences
        if (response.body.pipe) {
            // node-fetch style
            response.body.pipe(res);
        } else {
            // Native fetch (ReadableStream) -> Node Writable
            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();
        }

    } catch (error) {
        console.error('Proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.end();
        }
    }
});

// Serve Static Files
app.use(express.static(path.join(__dirname, '.')));

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`\n✅ Server Running!`);
    console.log(`📱 Local:   http://localhost:${PORT}`);
    console.log(`📡 Network: http://${ip}:${PORT}`);
    console.log(`\nUse the Network URL to access from other devices.\n`);
});
