"""
Tests for retrieval engine.
"""

import sys
from pathlib import Path
import numpy as np
import json
import os

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from retrieval_engine import JewelryRetrievalEngine
from filters import filter_cartier_by_attributes, filter_diamonds_by_attributes


def create_dummy_embeddings(output_path, num_items=10, dim=768):
    """Create dummy embeddings for testing."""
    embeddings = np.random.randn(num_items, dim).astype('float32')
    # Normalize
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / norms
    np.save(output_path, embeddings)
    return embeddings


def create_dummy_metadata(output_path, num_items=10, dataset_type="cartier"):
    """Create dummy metadata for testing."""
    if dataset_type == "cartier":
        metadata = {
            'data': [
                {
                    'id': f'item_{i}',
                    'title': f'Ring {i}',
                    'price': 1000.0 + i * 100,
                    'metals': ['yellow gold'] if i % 2 == 0 else ['white gold'],
                    'gemstones': ['diamond'] if i % 3 == 0 else [],
                    'band_width_mm': 3.0 + i * 0.5,
                }
                for i in range(num_items)
            ],
            'stats': {}
        }
    else:  # diamonds
        metadata = {
            'data': [
                {
                    'id': str(i),
                    'carat_weight': 0.5 + i * 0.1,
                    'color': 'E' if i % 2 == 0 else 'F',
                    'clarity': 'VVS2' if i % 2 == 0 else 'VS1',
                    'cut': 'Round',
                    'price': 1000.0 + i * 200,
                }
                for i in range(num_items)
            ],
            'stats': {}
        }
    
    with open(output_path, 'w') as f:
        json.dump(metadata, f)
    
    return metadata


def test_retrieval_engine_creation():
    """Test retrieval engine can be created."""
    # Create test files
    test_dir = "test_embeddings"
    os.makedirs(test_dir, exist_ok=True)
    
    embeddings_path = f"{test_dir}/test_embeddings.npy"
    metadata_path = f"{test_dir}/test_metadata.json"
    
    create_dummy_embeddings(embeddings_path, num_items=10)
    create_dummy_metadata(metadata_path, num_items=10, dataset_type="cartier")
    
    # Create engine
    engine = JewelryRetrievalEngine(
        embeddings_path=embeddings_path,
        metadata_path=metadata_path,
        dataset_type="cartier",
        index_type="flat"
    )
    
    assert engine is not None
    assert len(engine.metadata) == 10
    assert engine.embeddings.shape[0] == 10
    
    # Cleanup
    os.remove(embeddings_path)
    os.remove(metadata_path)
    os.rmdir(test_dir)
    
    print("✓ Retrieval engine creation test passed")


def test_search():
    """Test search functionality."""
    # Create test files
    test_dir = "test_embeddings"
    os.makedirs(test_dir, exist_ok=True)
    
    embeddings_path = f"{test_dir}/test_embeddings.npy"
    metadata_path = f"{test_dir}/test_metadata.json"
    
    embeddings = create_dummy_embeddings(embeddings_path, num_items=10)
    create_dummy_metadata(metadata_path, num_items=10, dataset_type="cartier")
    
    # Create engine
    engine = JewelryRetrievalEngine(
        embeddings_path=embeddings_path,
        metadata_path=metadata_path,
        dataset_type="cartier",
        index_type="flat"
    )
    
    # Create query (use first embedding as query)
    query_vec = embeddings[0]
    
    # Search
    results = engine.search(query_vec, top_k=5)
    
    assert len(results) > 0
    assert len(results) <= 5
    assert 'id' in results[0]
    assert 'score' in results[0]
    assert 'metadata' in results[0]
    
    # Cleanup
    os.remove(embeddings_path)
    os.remove(metadata_path)
    os.rmdir(test_dir)
    
    print("✓ Search test passed")


def test_filtering():
    """Test filtering functionality."""
    # Create dummy metadata
    metadata = [
        {
            'id': f'item_{i}',
            'price': 1000.0 + i * 100,
            'metals': ['yellow gold'] if i % 2 == 0 else ['white gold'],
        }
        for i in range(10)
    ]
    
    # Test price filter
    filters = {'price_min': 1200, 'price_max': 1500}
    valid_indices = filter_cartier_by_attributes(metadata, filters)
    
    assert len(valid_indices) > 0
    # Verify all valid items are in price range
    for idx in valid_indices:
        assert 1200 <= metadata[idx]['price'] <= 1500
    
    # Test metal filter
    filters = {'metal': ['yellow gold']}
    valid_indices = filter_cartier_by_attributes(metadata, filters)
    
    assert len(valid_indices) > 0
    for idx in valid_indices:
        assert 'yellow gold' in metadata[idx]['metals']
    
    print("✓ Filtering test passed")


if __name__ == "__main__":
    print("Running retrieval tests...\n")
    test_retrieval_engine_creation()
    test_search()
    test_filtering()
    print("\nAll retrieval tests passed!")



