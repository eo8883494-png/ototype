# -*- coding: utf-8 -*-
"""video/upload/ をCORS付きで配信する使い捨てサーバー(TikTok投稿ブリッジ用・127.0.0.1限定)。"""
import http.server
import functools

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

if __name__ == "__main__":
    handler = functools.partial(CORSHandler, directory=r"C:\dev\ototype\video\upload")
    http.server.ThreadingHTTPServer(("127.0.0.1", 8799), handler).serve_forever()
