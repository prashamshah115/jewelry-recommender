#!/usr/bin/env python3
"""
End-to-end system validation script.
Tests that all components work together correctly.
"""

import sys
import json
import numpy as np
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedding_utils import load_siglip_model, embed_text, embed_query, get_device
from retrieval_engine import load_retrieval_engine

def test_embedding_utils():
    """Test embedding utilities."""
    print("\n" + "="*60)
    print("Testing Embedding Utilities")
    print("="*60)
    
    try:
        print("Loading SigLIP model...")
        processor, model = load_siglip_model("google/siglip-base-patch16-224")
        device = get_device()
        print(f"✅ Model loaded on {device}")
        
        # Test text embedding
        print("\nTesting text embedding...")
        text_emb = embed_text("yellow gold engagement ring", processor, model, device)
        assert text_emb is not None, "Text embedding failed"
        assert text_emb.shape == (768,), f"Wrong embedding shape: {text_emb.shape}"
        assert np.allclose(np.linalg.norm(text_emb), 1.0), "Embedding not normalized"
        print(f"✅ Text embedding: shape {text_emb.shape}, norm {np.linalg.norm(text_emb):.4f}")
        
        # Test query embedding (text only)
        print("\nTesting query embedding (text only)...")
        query_emb = embed_query("ring", None, processor, model, device)
        assert query_emb is not None, "Query embedding failed"
        assert query_emb.shape == (768,), f"Wrong query embedding shape: {query_emb.shape}"
        print(f"✅ Query embedding (text): shape {query_emb.shape}")
        
        return processor, model, device
    except Exception as e:
        print(f"❌ Embedding utils test failed: {e}")
        return None, None, None

def test_retrieval_engines():
    """Test retrieval engines."""
    print("\n" + "="*60)
    print("Testing Retrieval Engines")
    print("="*60)
    
    engines = {}
    
    # Test Cartier engine
    try:
        print("\nLoading Cartier engine...")
        cartier = load_retrieval_engine("cartier", "embeddings")
        stats = cartier.get_stats()
        print(f"✅ Cartier engine loaded: {stats['num_items']} items")
        engines['cartier'] = cartier
    except Exception as e:
        print(f"❌ Cartier engine failed: {e}")
    
    # Test Diamonds engine
    try:
        print("\nLoading Diamonds engine...")
        diamonds = load_retrieval_engine("diamonds", "embeddings")
        stats = diamonds.get_stats()
        print(f"✅ Diamonds engine loaded: {stats['num_items']} items")
        engines['diamonds'] = diamonds
    except Exception as e:
        print(f"❌ Diamonds engine failed: {e}")
    
    return engines

def test_search(engines, processor, model, device):
    """Test search functionality."""
    print("\n" + "="*60)
    print("Testing Search Functionality")
    print("="*60)
    
    if not engines:
        print("⚠️  No engines available, skipping search tests")
        return False
    
    if processor is None or model is None:
        print("⚠️  Model not loaded, skipping search tests")
        return False
    
    success = True
    
    # Test Cartier search
    if 'cartier' in engines:
        try:
            print("\nTesting Cartier search...")
            query_text = "yellow gold ring"
            query_vec = embed_query(query_text, None, processor, model, device)
            
            results = engines['cartier'].search(query_vec, top_k=5)
            assert len(results) > 0, "No results returned"
            assert all('id' in r for r in results), "Results missing 'id'"
            assert all('score' in r for r in results), "Results missing 'score'"
            assert all('metadata' in r for r in results), "Results missing 'metadata'"
            
            print(f"✅ Cartier search: {len(results)} results")
            print(f"   Top result: ID={results[0]['id']}, Score={results[0]['score']:.4f}")
            success = True
        except Exception as e:
            print(f"❌ Cartier search failed: {e}")
            success = False
    
    # Test Diamonds search
    if 'diamonds' in engines:
        try:
            print("\nTesting Diamonds search...")
            query_text = "round brilliant diamond"
            query_vec = embed_query(query_text, None, processor, model, device)
            
            results = engines['diamonds'].search(query_vec, top_k=5)
            assert len(results) > 0, "No results returned"
            
            print(f"✅ Diamonds search: {len(results)} results")
            print(f"   Top result: ID={results[0]['id']}, Score={results[0]['score']:.4f}")
            success = success and True
        except Exception as e:
            print(f"❌ Diamonds search failed: {e}")
            success = False
    
    # Test filtering
    if 'cartier' in engines:
        try:
            print("\nTesting Cartier filtering...")
            query_text = "ring"
            query_vec = embed_query(query_text, None, processor, model, device)
            
            filters = {'price_min': 1000, 'price_max': 5000}
            results = engines['cartier'].search(query_vec, top_k=10, filters=filters)
            
            # Verify filters applied
            for result in results:
                price = result['metadata'].get('price')
                if price is not None:
                    assert price >= 1000, f"Price filter failed: {price}"
                    assert price <= 5000, f"Price filter failed: {price}"
            
            print(f"✅ Filtering: {len(results)} results within price range")
            success = success and True
        except Exception as e:
            print(f"❌ Filtering test failed: {e}")
            success = False
    
    return success

def main():
    """Run all validation tests."""
    print("="*60)
    print("System Validation")
    print("="*60)
    
    # Test embedding utilities
    processor, model, device = test_embedding_utils()
    if processor is None:
        print("\n❌ Cannot continue without embedding utilities")
        sys.exit(1)
    
    # Test retrieval engines
    engines = test_retrieval_engines()
    if not engines:
        print("\n❌ No retrieval engines available")
        sys.exit(1)
    
    # Test search
    search_success = test_search(engines, processor, model, device)
    
    # Summary
    print("\n" + "="*60)
    print("Validation Summary")
    print("="*60)
    print(f"Embedding Utils: ✅")
    print(f"Retrieval Engines: {'✅' if engines else '❌'}")
    print(f"Search Functionality: {'✅' if search_success else '❌'}")
    
    if engines and search_success:
        print("\n✅ System validation passed!")
        return 0
    else:
        print("\n❌ System validation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())



