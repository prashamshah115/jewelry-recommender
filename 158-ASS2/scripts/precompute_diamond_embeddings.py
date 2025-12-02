"""
Script to precompute diamond embeddings.
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
from embedding_utils import load_siglip_model, embed_text, get_device
from data_preprocessing import process_diamonds

# Configuration
MODEL_NAME = "google/siglip-base-patch16-224"
CSV_PATH = "diamonds.csv"
OUTPUT_DIR = "embeddings"
BATCH_SIZE = 32  # Process in batches for efficiency


def generate_diamond_prompt(item):
    """Generate rich text description for diamond embedding."""
    parts = []
    
    # Main description
    if item.get('carat_weight', 0) > 0:
        parts.append(f"{item['carat_weight']:.2f} carat")
    
    if item.get('cut') and item['cut'] != 'Unknown':
        parts.append(f"{item['cut']} cut")
    
    if item.get('shape') and item['shape'] != 'Unknown':
        parts.append(f"{item['shape']} shape")
    
    parts.append("diamond")
    
    # Quality attributes
    quality_parts = []
    if item.get('color') and item['color'] != 'Unknown':
        quality_parts.append(f"{item['color']} color")
    if item.get('clarity') and item['clarity'] != 'Unknown':
        quality_parts.append(f"{item['clarity']} clarity")
    if item.get('cut_quality') and item['cut_quality'] != 'Unknown':
        quality_parts.append(f"{item['cut_quality']} cut quality")
    
    if quality_parts:
        parts.append(", ".join(quality_parts))
    
    # Lab certification
    if item.get('lab') and item['lab'] != 'Unknown':
        parts.append(f"Certified by {item['lab']}")
    
    # Additional quality metrics
    if item.get('symmetry') and item['symmetry'] != 'Unknown':
        parts.append(f"Symmetry: {item['symmetry']}")
    if item.get('polish') and item['polish'] != 'Unknown':
        parts.append(f"Polish: {item['polish']}")
    
    # Measurements
    if item.get('meas_length') and item.get('meas_width') and item.get('meas_depth'):
        parts.append(f"Dimensions: {item['meas_length']:.2f}x{item['meas_width']:.2f}x{item['meas_depth']:.2f}mm")
    
    # Proportions
    if item.get('depth_percent') and item['depth_percent']:
        parts.append(f"Depth: {item['depth_percent']:.1f}%")
    if item.get('table_percent') and item['table_percent']:
        parts.append(f"Table: {item['table_percent']:.1f}%")
    
    # Price
    if item.get('price', 0) > 0:
        parts.append(f"Price: ${item['price']:.0f}")
    
    prompt = ". ".join(parts)
    # Ensure total length is reasonable (max ~300 chars to stay under 64 tokens)
    if len(prompt) > 300:
        prompt = prompt[:300] + "..."
    return prompt


def main():
    print("=" * 60)
    print("Precomputing Diamond Embeddings")
    print("=" * 60)
    
    # Load model
    print(f"\nLoading SigLIP model: {MODEL_NAME}")
    processor, model = load_siglip_model(MODEL_NAME)
    device = get_device()
    print(f"Using device: {device}\n")
    
    # Process diamonds dataset
    print("Processing diamonds dataset...")
    diamonds_data = process_diamonds(CSV_PATH)
    items = diamonds_data['data']
    print(f"Found {len(items)} diamonds\n")
    
    # Generate embeddings in batches
    print("Generating embeddings...")
    embeddings = []
    valid_indices = []
    
    for i in tqdm(range(0, len(items), BATCH_SIZE), desc="Processing batches"):
        batch = items[i:i+BATCH_SIZE]
        
        for idx, item in enumerate(batch):
            try:
                # Generate text prompt
                text_prompt = generate_diamond_prompt(item)
                
                # Embed text
                text_emb = embed_text(text_prompt, processor, model, device)
                
                embeddings.append(text_emb)
                valid_indices.append(i + idx)
                
            except Exception as e:
                if (i + idx) % 1000 == 0:  # Only print every 1000th error
                    print(f"\nError processing item {i + idx}: {e}")
                continue
    
    print(f"\nSuccessfully embedded {len(embeddings)} diamonds")
    
    # Convert to numpy array
    embeddings_array = np.array(embeddings)
    print(f"Embeddings shape: {embeddings_array.shape}")
    print(f"Embedding dimension: {embeddings_array.shape[1]}")
    
    # Save embeddings
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    embeddings_path = os.path.join(OUTPUT_DIR, "diamond_embeddings.npy")
    np.save(embeddings_path, embeddings_array)
    print(f"\nSaved embeddings to {embeddings_path}")
    print(f"File size: {os.path.getsize(embeddings_path) / (1024**2):.2f} MB")
    
    # Save metadata (only for successfully embedded items)
    valid_metadata = [items[i] for i in valid_indices]
    metadata_dict = {
        'data': valid_metadata,
        'stats': diamonds_data['stats']
    }
    metadata_path = os.path.join(OUTPUT_DIR, "diamond_metadata.json")
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

