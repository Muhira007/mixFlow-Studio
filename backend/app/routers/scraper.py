"""
mixFlow Studio — Scraper Router
POST /api/scrape  — Scrape product URL for title & description
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from app.services.scraper_service import scrape_product_url

router = APIRouter()


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL halaman produk")


class ScrapeResponse(BaseModel):
    title: str
    description: str
    body_text: str
    url: str


@router.post("", response_model=ScrapeResponse)
async def scrape_url(req: ScrapeRequest):
    """
    Scrape product URL and extract title, meta description, and body text.
    Used to provide product context to Script Generator.
    """
    try:
        result = await scrape_product_url(req.url)
        return ScrapeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gagal scraping: {str(e)}")
