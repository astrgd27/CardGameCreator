"""Build an offline ZIP with native ES modules and a loopback-only launcher."""
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
files = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
launcher = """from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import webbrowser
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent)))
url = f"http://127.0.0.1:{server.server_port}/index.html"
print(url, flush=True)
webbrowser.open(url)
server.serve_forever()
"""
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(files):
        path = root / name
        if not name or not path.is_file() or name.split("/")[0] in {".github","tests","scripts","standalone"}:
            continue
        if path.suffix.lower() in {".html",".js",".mjs",".css",".json",".png",".jpg",".jpeg",".webp",".svg",".woff",".woff2",".zip"}:
            archive.write(path, name)
    archive.writestr("launch.py", launcher)
    archive.writestr("OFFLINE.txt", "Extract the entire ZIP. Run python launch.py to open the workshop, module editor and duel locally. Internet is not required. Keep the terminal open.\n")
print(output)
