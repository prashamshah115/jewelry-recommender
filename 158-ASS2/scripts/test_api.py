#!/usr/bin/env python3
"""
Test script for API endpoints.
Tests health, stats, and recommendation endpoints.
"""

import requests
import json
import sys
from pathlib import Path
import time

API_BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint."""
    print("\n" + "="*60)
    print("Testing /api/health endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/health", timeout=5)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Health check passed")
        print(f"   Status: {data.get('status')}")
        print(f"   Model loaded: {data.get('model_loaded')}")
        print(f"   Cartier engine: {data.get('cartier_engine_loaded')}")
        print(f"   Diamonds engine: {data.get('diamonds_engine_loaded')}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to API at {API_BASE_URL}")
        print("   Make sure the API server is running: python api/main.py")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_stats():
    """Test stats endpoint."""
    print("\n" + "="*60)
    print("Testing /api/stats endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/stats", timeout=5)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Stats endpoint working")
        
        if 'cartier' in data:
            cartier = data['cartier']
            print(f"   Cartier: {cartier.get('num_items')} items, {cartier.get('embedding_dim')}D, {cartier.get('index_type')} index")
        
        if 'diamonds' in data:
            diamonds = data['diamonds']
            print(f"   Diamonds: {diamonds.get('num_items')} items, {diamonds.get('embedding_dim')}D, {diamonds.get('index_type')} index")
        
        return True
    except Exception as e:
        print(f"❌ Stats check failed: {e}")
        return False

def test_text_query(dataset="cartier", query="yellow gold ring"):
    """Test text-only query."""
    print("\n" + "="*60)
    print(f"Testing text query: '{query}' (dataset: {dataset})")
    print("="*60)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/api/recommend",
            data={
                "query_text": query,
                "dataset": dataset,
                "top_k": 5
            },
            timeout=30
        )
        elapsed = time.time() - start_time
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Query successful (took {elapsed:.2f}s)")
        print(f"   Query type: {data['query_info']['query_type']}")
        print(f"   Results: {data['query_info']['num_results']}")
        print(f"   Embedding dim: {data['query_info']['embedding_dim']}")
        
        if data['results']:
            print(f"\n   Top result:")
            top = data['results'][0]
            print(f"      ID: {top['id']}")
            print(f"      Score: {top['similarity_score']:.4f}")
            if 'title' in top['metadata']:
                print(f"      Title: {top['metadata']['title']}")
            elif 'carat_weight' in top['metadata']:
                print(f"      Carat: {top['metadata']['carat_weight']}")
        
        return True
    except Exception as e:
        print(f"❌ Query failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"   Error detail: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {e.response.text}")
        return False

def test_filtered_query(dataset="cartier"):
    """Test query with filters."""
    print("\n" + "="*60)
    print(f"Testing filtered query (dataset: {dataset})")
    print("="*60)
    
    try:
        filters = {
            "query_text": "ring",
            "dataset": dataset,
            "top_k": 5,
            "price_min": 1000,
            "price_max": 5000
        }
        
        if dataset == "cartier":
            filters["metal"] = "yellow gold"
        elif dataset == "diamonds":
            filters["carat_min"] = 1.0
            filters["carat_max"] = 2.0
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/api/recommend",
            data=filters,
            timeout=30
        )
        elapsed = time.time() - start_time
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Filtered query successful (took {elapsed:.2f}s)")
        print(f"   Results: {data['query_info']['num_results']}")
        
        if data['results']:
            print(f"\n   Sample results:")
            for i, result in enumerate(data['results'][:3], 1):
                print(f"      {i}. ID: {result['id']}, Score: {result['similarity_score']:.4f}")
        
        return True
    except Exception as e:
        print(f"❌ Filtered query failed: {e}")
        return False

def main():
    """Run all tests."""
    print("="*60)
    print("API Test Suite")
    print("="*60)
    
    # Test health
    if not test_health():
        print("\n❌ API is not running. Please start it first.")
        sys.exit(1)
    
    # Test stats
    if not test_stats():
        print("\n⚠️  Stats endpoint has issues, but continuing...")
    
    # Test text queries
    print("\n" + "="*60)
    print("Testing Text Queries")
    print("="*60)
    
    test_text_query("cartier", "yellow gold ring")
    test_text_query("cartier", "platinum engagement ring")
    test_text_query("diamonds", "round brilliant diamond")
    
    # Test filtered queries
    print("\n" + "="*60)
    print("Testing Filtered Queries")
    print("="*60)
    
    test_filtered_query("cartier")
    test_filtered_query("diamonds")
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)




