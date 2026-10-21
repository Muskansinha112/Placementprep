import sys
from pathlib import Path

from fastapi.testclient import TestClient
import fitz

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_rejects_non_pdf():
    response = client.post(
        "/extract-pdf", files={"file": ("notes.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 415


def test_rejects_malformed_pdf():
    response = client.post(
        "/extract-pdf", files={"file": ("resume.pdf", b"not a pdf", "application/pdf")}
    )
    assert response.status_code == 422


def test_extracts_text_and_page_count_from_pdf():
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Python and FastAPI interview notes")
    pdf_bytes = document.tobytes()
    document.close()

    response = client.post(
        "/extract-pdf",
        files={"file": ("notes.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    assert "Python and FastAPI" in response.json()["text"]
    assert response.json()["num_pages"] == 1
