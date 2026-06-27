"""
mixFlow — Web Scraper Service
Handles: product URL scraping (title, description, body text).
"""

import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "id,en;q=0.9",
}


async def scrape_product_url(url: str) -> dict:
    """
    Scrape product page and extract title, description, and body text.

    Returns:
        { title, description, body_text, url }
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        response = await client.get(url, headers=HEADERS)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")

    # Remove script/style tags
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Extract title
    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"]
    elif soup.title:
        title = soup.title.get_text(strip=True)

    # Extract description
    description = ""
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        description = og_desc["content"]
    elif soup.find("meta", attrs={"name": "description"}):
        description = soup.find("meta", attrs={"name": "description"}).get("content", "")

    # Extract body text
    body = soup.get_text(separator=" ", strip=True)
    # Clean up whitespace
    body = re.sub(r"\s+", " ", body)
    # Truncate to reasonable length
    body = body[:3000]

    return {
        "title": title or "Tidak ditemukan",
        "description": description or "Tidak ditemukan",
        "body_text": body,
        "url": url,
    }
