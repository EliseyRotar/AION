"""
Test the async test client fixture.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_client_fixture(test_client: AsyncClient):
    """Test that the async test client fixture works correctly."""
    response = await test_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "AI Hub Enterprise"
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_client_with_auth(test_client: AsyncClient, auth_headers_admin: dict):
    """Test that the test client works with authentication headers."""
    # This test verifies that we can make authenticated requests
    # We'll just verify the headers are properly formatted for now
    assert "Authorization" in auth_headers_admin
    assert auth_headers_admin["Authorization"].startswith("Bearer ")
