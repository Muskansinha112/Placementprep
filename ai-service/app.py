"""Small PDF extraction service used by the Express application."""

from io import BytesIO
from typing import Any

import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="PlacementPrep AI document service", version="1.0.0")
MAX_PDF_BYTES = 10 * 1024 * 1024


class PdfExtraction(BaseModel):
    text: str
    num_pages: int
    info: dict[str, Any]


def extract_pdf(content: bytes) -> PdfExtraction:
    if not content:
        raise ValueError("PDF file is empty")
    try:
        with fitz.open(stream=BytesIO(content), filetype="pdf") as document:
            text = "\n".join(page.get_text("text") for page in document).strip()
            pages = len(document)
            metadata = document.metadata or {}
    except Exception as exc:
        raise ValueError("Could not read this PDF. Check that it is a valid, unencrypted PDF.") from exc
    if not text:
        raise ValueError("No selectable text found. Scanned PDFs are not supported yet.")
    # Keep only simple metadata values that Pydantic can serialize consistently.
    info = {key: value for key, value in metadata.items() if isinstance(value, (str, int, float, bool))}
    return PdfExtraction(text=text, num_pages=pages, info=info)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/extract-pdf", response_model=PdfExtraction)
async def extract_pdf_endpoint(file: UploadFile = File(...)) -> PdfExtraction:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Please upload a PDF file.")
    content = await file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 10 MB service limit.")
    try:
        return extract_pdf(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
