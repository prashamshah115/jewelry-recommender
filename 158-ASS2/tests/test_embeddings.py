"""
Tests for embedding utilities.
"""

import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedding_utils import (
    load_siglip_model,
    embed_text,
    embed_image,
    fuse_embeddings,
    normalize_embedding,
    get_device
)


def test_model_loading():
    """Test that model loads correctly."""
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    assert processor is not None
    assert model is not None
    assert model.training == False  # Should be in eval mode
    print("✓ Model loading test passed")


def test_text_embedding():
    """Test text embedding generation."""
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    
    text = "1 carat round diamond, E color, VVS2 clarity, excellent cut"
    embedding = embed_text(text, processor, model, device)
    
    assert embedding is not None
    assert isinstance(embedding, np.ndarray)
    assert embedding.shape[0] > 0  # Should have some dimension
    assert np.abs(np.linalg.norm(embedding) - 1.0) < 0.01  # Should be normalized
    print("✓ Text embedding test passed")


def test_embedding_normalization():
    """Test embedding normalization."""
    # Create a random embedding
    embedding = np.random.randn(768)
    normalized = normalize_embedding(embedding)
    
    assert np.abs(np.linalg.norm(normalized) - 1.0) < 0.01
    print("✓ Embedding normalization test passed")


def test_fuse_embeddings():
    """Test embedding fusion."""
    # Create two random embeddings
    emb1 = np.random.randn(768)
    emb1 = normalize_embedding(emb1)
    
    emb2 = np.random.randn(768)
    emb2 = normalize_embedding(emb2)
    
    # Fuse with equal weights
    fused = fuse_embeddings([emb1, emb2], [0.5, 0.5])
    
    assert fused is not None
    assert isinstance(fused, np.ndarray)
    assert fused.shape == emb1.shape
    assert np.abs(np.linalg.norm(fused) - 1.0) < 0.01  # Should be normalized
    print("✓ Embedding fusion test passed")


def test_fuse_embeddings_with_none():
    """Test fusion handles None embeddings."""
    emb1 = np.random.randn(768)
    emb1 = normalize_embedding(emb1)
    
    # Fuse with one None embedding
    fused = fuse_embeddings([emb1, None], [0.5, 0.5])
    
    assert fused is not None
    assert np.abs(np.linalg.norm(fused) - 1.0) < 0.01
    print("✓ Fusion with None test passed")


if __name__ == "__main__":
    print("Running embedding tests...\n")
    test_model_loading()
    test_text_embedding()
    test_embedding_normalization()
    test_fuse_embeddings()
    test_fuse_embeddings_with_none()
    print("\nAll embedding tests passed!")



