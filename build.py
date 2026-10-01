#!/usr/bin/env python3
"""NutriPlan build: keep index.html (self-contained) in sync with sources.

Usage:
    python build.py            # bundle styles.css + data.js + app.js -> index.html
    python build.py --extract  # split index.html back into styles.css/data.js/app.js
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CSS_LINK = '<link rel="stylesheet" href="styles.css">'
DATA_TAG = '<script src="data.js"></script>'
APP_TAG = '<script src="app.js"></script>'


def bundle():
    html = io.open(os.path.join(HERE, "_src_index.html"), encoding="utf-8").read()
    css = io.open(os.path.join(HERE, "styles.css"), encoding="utf-8").read()
    data = io.open(os.path.join(HERE, "data.js"), encoding="utf-8").read()
    app = io.open(os.path.join(HERE, "app.js"), encoding="utf-8").read()
    out = html.replace(CSS_LINK, "<style>\n" + css + "</style>")
    out = out.replace(DATA_TAG, "<script>\n" + data + "</script>")
    out = out.replace(APP_TAG, "<script>\n" + app + "</script>")
    io.open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(out)
    print("bundled -> index.html (%d KB)" % (len(out) // 1024))


def extract():
    html = io.open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
    import re
    m = re.search(r"<style>\n(.*?)\n</style>", html, re.S)
    scripts = re.findall(r"<script>\n(.*?)\n</script>", html, re.S)
    assert m and len(scripts) == 2, "index.html does not look like a bundled build"
    io.open(os.path.join(HERE, "styles.css"), "w", encoding="utf-8").write(m.group(1) + "\n")
    io.open(os.path.join(HERE, "data.js"), "w", encoding="utf-8").write(scripts[0] + "\n")
    io.open(os.path.join(HERE, "app.js"), "w", encoding="utf-8").write(scripts[1] + "\n")
    linked = html.replace("<style>\n" + m.group(1) + "\n</style>", CSS_LINK)
    linked = linked.replace("<script>\n" + scripts[0] + "\n</script>", DATA_TAG)
    linked = linked.replace("<script>\n" + scripts[1] + "\n</script>", APP_TAG)
    io.open(os.path.join(HERE, "_src_index.html"), "w", encoding="utf-8").write(linked)
    print("extracted -> styles.css, data.js, app.js, _src_index.html")


if __name__ == "__main__":
    if "--extract" in sys.argv:
        extract()
    else:
        bundle()
