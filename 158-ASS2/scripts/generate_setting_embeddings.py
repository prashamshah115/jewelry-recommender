"""
Generate embeddings for all settings (including augmented ones).
Creates embeddings for all 1,448 settings from their metadata.
"""

import json
import numpy as np
from pathlib import Path
import sys
from tqdm import tqdm

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedding_utils import load_siglip_model, embed_text, get_device


def generate_setting_prompt(setting):
    """Generate text prompt for a setting from its metadata."""
    parts = []
    
    # Name
    if setting.get('name'):
        parts.append(setting['name'])
    
    # Metal
    if setting.get('metal'):
        parts.append(f"{setting['metal']} metal")
    
    # Style
    if setting.get('style'):
        parts.append(f"{setting['style']} style")
    
    # Description
    if setting.get('description'):
        parts.append(setting['description'])
    
    # Band width
    if setting.get('band_width_mm'):
        parts.append(f"band width {setting['band_width_mm']}mm")
    
    # Gemstones
    if setting.get('gemstones'):
        parts.append(f"with {', '.join(setting['gemstones'])}")
    
    prompt = ". ".join(parts)
    
    # Truncate if too long (SigLIP max_position_embeddings is 64 tokens)
    # Rough estimate: ~4 chars per token, so ~250 chars max to be safe
    if len(prompt) > 250:
        prompt = prompt[:250] + "..."
    
    return prompt


def main():
    """Generate embeddings for all settings."""
    print("=" * 60)
    print("Generating Setting Embeddings")
    print("=" * 60)
    
    # Load settings metadata
    settings_path = "embeddings/setting_metadata.json"
    print(f"\nLoading settings from {settings_path}...")
    with open(settings_path, 'r') as f:
        settings_data = json.load(f)
    
    settings = settings_data['data']
    num_settings = len(settings)
    print(f"Found {num_settings} settings to process")
    
    # Load SigLIP model
    print("\nLoading SigLIP model...")
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    print(f"Model loaded on {device}")
    
    # Generate embeddings
    print(f"\nGenerating embeddings for {num_settings} settings...")
    embeddings = []
    failed = []
    
    for i, setting in enumerate(tqdm(settings, desc="Processing")):
        try:
            # Generate prompt
            prompt = generate_setting_prompt(setting)
            
            # Embed
            embedding = embed_text(prompt, processor, model, device)
            
            if embedding is not None:
                embeddings.append(embedding)
            else:
                print(f"\n⚠️  Warning: Failed to embed setting {setting.get('id', i)}")
                failed.append(i)
                # Use zero vector as fallback
                embeddings.append(np.zeros(768))
        except Exception as e:
            print(f"\n❌ Error processing setting {setting.get('id', i)}: {e}")
            failed.append(i)
            # Use zero vector as fallback
            embeddings.append(np.zeros(768))
    
    # Convert to numpy array
    embeddings_array = np.array(embeddings).astype('float32')
    print(f"\n✅ Generated {len(embeddings)} embeddings")
    print(f"   Shape: {embeddings_array.shape}")
    print(f"   Failed: {len(failed)}")
    
    # Save embeddings
    output_path = "embeddings/setting_embeddings.npy"
    print(f"\nSaving embeddings to {output_path}...")
    np.save(output_path, embeddings_array)
    print(f"✅ Saved {embeddings_array.shape[0]} embeddings")
    
    # Verify
    loaded = np.load(output_path)
    print(f"✅ Verification: Loaded {loaded.shape[0]} embeddings")
    print(f"   Embedding dimension: {loaded.shape[1]}")
    
    # Check for zero vectors (failed embeddings)
    zero_vectors = np.sum(np.all(embeddings_array == 0, axis=1))
    if zero_vectors > 0:
        print(f"\n⚠️  Warning: {zero_vectors} embeddings are zero vectors (failed)")
    
    print("\n" + "=" * 60)
    print("✅ Setting embeddings generation complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()

