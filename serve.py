#!/usr/bin/env python3
"""Dev server for Operation: Freedom Force.

Identical to `python3 -m http.server` except it tells the browser never to
cache anything. Plain http.server sends only Last-Modified, which lets a
browser reuse a stale game.js on a normal reload — you end up testing code you
already changed and chasing bugs that are fixed on disk.

    python3 serve.py [port]        # default 8000
"""
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'Freedom Force dev server -> http://127.0.0.1:{port}  (caching disabled)')
    try:
        HTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
    except KeyboardInterrupt:
        print('\nstopped')
