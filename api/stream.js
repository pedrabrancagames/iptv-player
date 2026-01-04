/**
 * Vercel Serverless Function - Video Stream Proxy
 * Proxies HTTP video streams to avoid Mixed Content errors
 * Uses streaming to minimize memory usage
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
        return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Decode the URL
        const targetUrl = decodeURIComponent(videoUrl);

        // Get range header for seeking support
        const rangeHeader = request.headers.get('range');

        // Build headers for the upstream request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Player/1.0)',
        };

        if (rangeHeader) {
            headers['Range'] = rangeHeader;
        }

        // Make the request to the video URL
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers
        });

        if (!response.ok && response.status !== 206) {
            return new Response(`Upstream error: ${response.status}`, {
                status: response.status
            });
        }

        // Get content info from response
        const contentType = response.headers.get('content-type') || 'video/mp4';
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');

        // Build response headers
        const responseHeaders = new Headers({
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            'Cache-Control': 'public, max-age=3600',
        });

        if (contentLength) {
            responseHeaders.set('Content-Length', contentLength);
        }
        if (contentRange) {
            responseHeaders.set('Content-Range', contentRange);
        }
        if (acceptRanges) {
            responseHeaders.set('Accept-Ranges', acceptRanges);
        }

        // Return streaming response
        return new Response(response.body, {
            status: response.status,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('Stream proxy error:', error);
        return new Response(`Proxy error: ${error.message}`, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
