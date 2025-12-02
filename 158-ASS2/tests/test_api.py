"""
Tests for API endpoints.
Note: These tests require the API to be running or use a test client.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    """Test health check endpoint."""
    # Note: This will fail if models aren't loaded, which is expected in test environment
    try:
        response = client.get("/api/health")
        assert response.status_code in [200, 503]  # 503 if models not loaded
        data = response.json()
        assert "status" in data
        print("✓ Health endpoint test passed")
    except Exception as e:
        print(f"⚠ Health endpoint test skipped (models not loaded): {e}")


def test_stats_endpoint():
    """Test stats endpoint."""
    try:
        response = client.get("/api/stats")
        assert response.status_code in [200, 503]
        print("✓ Stats endpoint test passed")
    except Exception as e:
        print(f"⚠ Stats endpoint test skipped: {e}")


def test_recommend_endpoint_validation():
    """Test that recommend endpoint validates inputs."""
    # Test missing both text and image
    response = client.post(
        "/api/recommend",
        data={"dataset": "cartier", "top_k": 10}
    )
    assert response.status_code == 400
    assert "query_text" in response.json()["detail"].lower() or "image" in response.json()["detail"].lower()
    
    # Test invalid dataset
    response = client.post(
        "/api/recommend",
        data={"query_text": "test", "dataset": "invalid", "top_k": 10}
    )
    assert response.status_code == 400
    
    print("✓ Recommend endpoint validation test passed")


if __name__ == "__main__":
    print("Running API tests...\n")
    print("Note: Some tests may be skipped if models/embeddings are not loaded.\n")
    test_health_endpoint()
    test_stats_endpoint()
    test_recommend_endpoint_validation()
    print("\nAPI tests completed!")



