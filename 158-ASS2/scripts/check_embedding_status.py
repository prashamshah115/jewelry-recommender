#!/usr/bin/env python3
"""
Quick script to check embedding generation status.
"""
import os
import json
import numpy as np
from pathlib import Path

def check_embeddings():
    """Check status of generated embeddings."""
    embeddings_dir = Path("embeddings")
    
    print("=" * 60)
    print("Embedding Generation Status")
    print("=" * 60)
    
    # Check Cartier
    cartier_emb_path = embeddings_dir / "cartier_embeddings.npy"
    cartier_meta_path = embeddings_dir / "cartier_metadata.json"
    
    if cartier_emb_path.exists() and cartier_meta_path.exists():
        cartier_emb = np.load(cartier_emb_path)
        with open(cartier_meta_path, 'r') as f:
            cartier_meta = json.load(f)
        
        print(f"\n✅ Cartier Embeddings:")
        print(f"   Items: {len(cartier_meta['data'])}")
        print(f"   Embedding shape: {cartier_emb.shape}")
        print(f"   File size: {cartier_emb_path.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"   All normalized: {np.allclose(np.linalg.norm(cartier_emb, axis=1), 1.0)}")
    else:
        print(f"\n❌ Cartier Embeddings: Not found")
    
    # Check Diamonds
    diamond_emb_path = embeddings_dir / "diamond_embeddings.npy"
    diamond_meta_path = embeddings_dir / "diamond_metadata.json"
    
    if diamond_emb_path.exists() and diamond_meta_path.exists():
        diamond_emb = np.load(diamond_emb_path)
        with open(diamond_meta_path, 'r') as f:
            diamond_meta = json.load(f)
        
        print(f"\n✅ Diamond Embeddings:")
        print(f"   Items: {len(diamond_meta['data'])}")
        print(f"   Embedding shape: {diamond_emb.shape}")
        print(f"   File size: {diamond_emb_path.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"   All normalized: {np.allclose(np.linalg.norm(diamond_emb, axis=1), 1.0)}")
    else:
        print(f"\n⏳ Diamond Embeddings: In progress or not started")
        if diamond_emb_path.exists():
            # Check if file is being written (size > 0 but metadata doesn't exist)
            size_mb = diamond_emb_path.stat().st_size / 1024 / 1024
            print(f"   Partial file exists: {size_mb:.2f} MB")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_embeddings()




