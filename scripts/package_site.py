"""Проверка статического сайта и упаковка ZIP для NetAngels."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ("about", "assets", "contacts", "expertise", "projects", "services")
ROOT_FILES = ("index.html", "robots.txt", "sitemap.xml", ".htaccess")
OUTPUT_NAME = "aldanteh-netangels.zip"


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


def inside_root(path):
    try:
        path.resolve().relative_to(ROOT.resolve())
        return True
    except ValueError:
        return False


def collect_files():
    files = [ROOT / name for name in ROOT_FILES if (ROOT / name).exists()]
    for name in DIRECTORIES:
        folder = ROOT / name
        if folder.is_dir():
            files.extend(path for path in folder.rglob("*") if path.is_file())
    return sorted(files)


def resolve_local(reference, source, files_set, pages):
    url = urlsplit(reference)
    if url.scheme or url.netloc:
        return
    raw = unquote(url.path)
    if not raw:
        target = source
    elif raw in (".", "./"):
        target = ROOT / "index.html"
    elif raw.startswith("/"):
        target = ROOT / raw.lstrip("/")
    else:
        # Support <base href="./|../|../../">: site-root relative links
        match = re.search(r'<base\s+href=["\']([^"\']+)["\']', source.read_text(encoding="utf-8"), re.I)
        base = match.group(1) if match else "./"
        target = (source.parent / base / raw).resolve()
        if raw.replace("\\", "/") in {"./", "../", "../../", ".", ".."} or set(raw.replace("\\", "/").split("/")) <= {".", "..", ""}:
            target = ROOT / "index.html"
    if not inside_root(target):
        if raw.replace("\\", "/") in {"./", "../", "../../", ".", ".."}:
            target = ROOT / "index.html"
        else:
            raise ValueError("path outside site: " + reference)
    target = target.resolve()
    if target.is_dir():
        target = target / "index.html"
    if target not in files_set:
        raise ValueError("missing packaged file: " + reference)
    if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
        raise ValueError("missing anchor: " + reference)


def build():
    files = collect_files()
    files_set = set(files)
    pages = {path: Page(path.read_text(encoding="utf-8")) for path in files if path.suffix == ".html"}
    errors = []

    for path, page in pages.items():
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        if page.headings != 1 or len(page.ids) != len(set(page.ids)):
            errors.append(rel + ": invalid H1 count or duplicate IDs")
        for reference in page.references:
            try:
                resolve_local(reference, path, files_set, pages)
            except ValueError as exc:
                errors.append(rel + ": " + str(exc))

    for path in files:
        if path.suffix not in (".js", ".css", ".svg"):
            continue
        text = path.read_text(encoding="utf-8")
        for reference in re.findall(r"/assets/[A-Za-z0-9_./-]+", text):
            try:
                resolve_local(reference, path, files_set, pages)
            except ValueError as exc:
                errors.append(str(path.relative_to(ROOT)).replace("\\", "/") + ": " + str(exc))

    locations = ET.parse(str(ROOT / "sitemap.xml")).findall(".//{*}loc")
    sitemap_pages = set()
    for location in locations:
        path = urlsplit(location.text).path
        try:
            resolve_local(path, ROOT / "sitemap.xml", files_set, pages)
        except ValueError as exc:
            errors.append("sitemap.xml: " + str(exc))
        target = ROOT / path.lstrip("/")
        sitemap_pages.add(target / "index.html" if target.is_dir() else target)
    if sitemap_pages != set(pages):
        errors.append("Sitemap does not match HTML pages")

    if errors:
        sys.stderr.write("Ошибки проверки:\n" + "\n".join(errors) + "\n")
        raise SystemExit(1)

    outputs = [ROOT / OUTPUT_NAME, ROOT / "dist" / OUTPUT_NAME]
    (ROOT / "dist").mkdir(exist_ok=True)
    for output in outputs:
        with ZipFile(str(output), "w", ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                archive.write(str(path), path.relative_to(ROOT).as_posix())
        with ZipFile(str(output)) as archive:
            if archive.testzip() is not None:
                raise SystemExit("Archive integrity check failed: " + str(output))

    print("Готово. Упаковано файлов:", len(files))
    print("Архив (открой в проводнике):")
    for output in outputs:
        print(" ", output.resolve())


if __name__ == "__main__":
    build()
