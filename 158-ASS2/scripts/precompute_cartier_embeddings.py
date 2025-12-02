"""
Script to precompute Cartier ring embeddings.
Can be run directly or imported into a notebook.
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import numpy as np
import json
from tqdm import tqdm
from embedding_utils import load_siglip_model, embed_text, embed_image, fuse_embeddings, get_device
from data_preprocessing import process_cartier_catalog

# Configuration
MODEL_NAME = "google/siglip-base-patch16-224"
CSV_PATH = "cartier_catalog.csv"
OUTPUT_DIR = "embeddings"
IMAGE_BASE_PATH = "data/images"  # Adjust if images are stored elsewhere


def generate_text_prompt(item):
    """Generate rich text description for embedding."""
    parts = []
    
    # Title and style
    parts.append(item['title'])
    if item.get('styles'):
        parts.append(", ".join(item['styles']))
    
    # Description (truncate if too long)
    if item.get('description'):
        desc = item['description']
        if len(desc) > 200:  # Rough token estimate: ~200 chars = ~50 tokens
            desc = desc[:200] + "..."
        parts.append(desc)
    
    # Metal
    if item.get('metals'):
        parts.append(f"Metal: {', '.join(item['metals'])}")
    
    # Gemstones
    if item.get('gemstones'):
        parts.append(f"Gemstones: {', '.join(item['gemstones'])}")
    
    # Band width
    if item.get('band_width_mm'):
        parts.append(f"Band width: {item['band_width_mm']}mm")
    
    # Price
    if item.get('price'):
        parts.append(f"Price: ${item['price']:.0f}")
    
    prompt = ". ".join(parts)
    # Ensure total length is reasonable (max ~300 chars to stay under 64 tokens)
    if len(prompt) > 300:
        prompt = prompt[:300] + "..."
    return prompt


def main():
    print("=" * 60)
    print("Precomputing Cartier Ring Embeddings")
    print("=" * 60)
    
    # Load model
    print(f"\nLoading SigLIP model: {MODEL_NAME}")
    processor, model = load_siglip_model(MODEL_NAME)
    device = get_device()
    print(f"Using device: {device}\n")
    
    # Process Cartier catalog
    print("Processing Cartier catalog...")
    cartier_data = process_cartier_catalog(CSV_PATH)
    items = cartier_data['data']
    print(f"Found {len(items)} Cartier items\n")
    
    # Generate embeddings
    print("Generating embeddings...")
    embeddings = []
    valid_indices = []
    
    for idx, item in enumerate(tqdm(items, desc="Embedding items")):
        try:
            # Generate text prompt
            text_prompt = generate_text_prompt(item)
            text_emb = embed_text(text_prompt, processor, model, device)
            
            # Try to load image if path exists
            image_emb = None
            if item.get('image_path'):
                # Try different possible image paths
                image_paths = [
                    item['image_path'],
                    os.path.join(IMAGE_BASE_PATH, os.path.basename(item['image_path'])),
                    item['image_path'].lstrip('/'),
                ]
                
                for img_path in image_paths:
                    if os.path.exists(img_path):
                        image_emb = embed_image(img_path, processor, model, device)
                        break
            
            # Fuse embeddings: 60% image + 40% text (if image available)
            if image_emb is not None:
                fused_emb = fuse_embeddings([image_emb, text_emb], [0.6, 0.4])
            else:
                fused_emb = text_emb
            
            embeddings.append(fused_emb)
            valid_indices.append(idx)
            
        except Exception as e:
            print(f"\nError processing item {idx} ({item.get('id', 'unknown')}): {e}")
            continue
    
    print(f"\nSuccessfully embedded {len(embeddings)} items")
    
    # Convert to numpy array
    embeddings_array = np.array(embeddings)
    print(f"Embeddings shape: {embeddings_array.shape}")
    print(f"Embedding dimension: {embeddings_array.shape[1]}")
    
    # Save embeddings
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    embeddings_path = os.path.join(OUTPUT_DIR, "cartier_embeddings.npy")
    np.save(embeddings_path, embeddings_array)
    print(f"\nSaved embeddings to {embeddings_path}")
    
    # Save metadata (only for successfully embedded items)
    valid_metadata = [items[i] for i in valid_indices]
    metadata_dict = {
        'data': valid_metadata,
        'stats': cartier_data['stats']
    }
    metadata_path = os.path.join(OUTPUT_DIR, "cartier_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata_dict, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    # Verify
    loaded_embeddings = np.load(embeddings_path)
    print(f"\nVerification: Loaded {loaded_embeddings.shape[0]} embeddings")
    print(f"Sample embedding norm: {np.linalg.norm(loaded_embeddings[0]):.4f}")
    print("\nDone!")


if __name__ == "__main__":
    main()

