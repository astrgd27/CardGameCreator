"""Bundle the workshop into one offline HTML document using the Python standard library."""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text()
style = (root / "style.css").read_text()
help_page = (root / "help.html").read_text()
import base64
help_url = "data:text/html;base64," + base64.b64encode(
    help_page.replace('<link rel="stylesheet" href="style.css" />', '<style>'+style+'</style>').encode()
).decode()
modules = []
for filename in ["engine.js", "storage.js", "benchmarks.js", "app.js"]:
    code = (root / filename).read_text()
    code = re.sub(r'^import\s+[^;]+;\s*', '', code, flags=re.MULTILINE)
    modules.append(re.sub(r'^export ', '', code, flags=re.MULTILINE))
code = "\n".join(modules)
# A Blob URL allows local handbook navigation in browsers that block data URL tabs.
code = "const handbookURL=URL.createObjectURL(await (await fetch('" + help_url + "')).blob());\n" + code
code += "\ndocument.addEventListener('click',e=>{const a=e.target.closest('a[href=\"help.html\"]');if(a)a.href=handbookURL},true);"
html = html.replace('<link rel="stylesheet" href="style.css" />', '<style>'+style+'</style>')
html = html.replace('<script src="vendor/jszip.min.js"></script>', '<script>'+(root/'vendor/jszip.min.js').read_text()+'</script>')
html = html.replace('<script type="module" src="app.js"></script>', '<script type="module">'+code.replace('</script','<\\/script')+'</script>')
Path(sys.argv[1]).write_text(html)
