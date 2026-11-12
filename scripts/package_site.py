"""Проверка статического сайта и упаковка для хостинга; без внешних зависимостей."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ("about", "assets", "contacts", "expertise", "projects", "services")


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []
        self.references = []
        self.headings = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "h1":
            self.headings += 1
        for key in ("src", "href"):
            if key in attrs:
                self.references.append(attrs[key])


def build():
    files = [ROOT / name for name in ("index.html", "robots.txt", "sitemap.xml")]
    for name in DIRECTORIES:
        files.extend(path for path in (ROOT / name).rglob("*") if path.is_file())
    files = sorted(files)
    pages = {path: Page(path.read_text(encoding="utf-8")) for path in files if path.suffix == ".html"}
    errors = []

    def check(reference, source):
        url = urlsplit(reference)
        if url.scheme or url.netloc:
            return
        path = unquote(url.path)
        target = ROOT / path.lstrip("/") if path.startswith("/") else source.parent / path if path else source
        target = target.resolve()
        if not target.is_relative_to(ROOT):
            errors.append(f"{source.name}: path outside site: {reference}")
            return
        if target.is_dir():
            target /= "index.html"
        if target not in files:
            errors.append(f"{source.name}: missing packaged file: {reference}")
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f"{source.name}: missing anchor: {reference}")

    for path, page in pages.items():
        if page.headings != 1 or len(page.ids) != len(set(page.ids)):
            errors.append(f"{path.name}: invalid H1 count or duplicate IDs")
        for reference in page.references:
            check(reference, path)
    for path in files:
        if path.suffix in (".js", ".css", ".svg"):
            text = path.read_text(encoding="utf-8")
            for reference in re.findall(r"/assets/[A-Za-z0-9_./-]+", text):
                check(reference, path)
    locations = ET.parse(ROOT / "sitemap.xml").findall(".//{*}loc")
    sitemap_pages = set()
    for location in locations:
        path = urlsplit(location.text).path
        check(path, ROOT / "sitemap.xml")
        target = ROOT / path.lstrip("/")
        sitemap_pages.add(target / "index.html" if target.is_dir() else target)
    if sitemap_pages != set(pages):
        errors.append("Sitemap does not match HTML pages")
    if errors:
        raise SystemExit("\n".join(errors))

    output = ROOT / "dist" / "aldanteh-netangels.zip"
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
    with ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise SystemExit("Archive integrity check failed")
    print(f"Checked {len(pages)} pages; packaged {len(files)} files; {output.stat().st_size:,} bytes")
    print(output)


if __name__ == "__main__":
    build()
