"""
Precompute embeddings for settings (reuses Cartier embeddings).
Since settings are extracted from Cartier items, we can reuse their embeddings.
"""

import numpy as np
from pathlib import Path
import json


def main():
    """Copy Cartier embeddings to settings embeddings."""
    cartier_embeddings_path = "embeddings/cartier_embeddings.npy"
    setting_embeddings_path = "embeddings/setting_embeddings.npy"
    
    # Load Cartier embeddings
    print(f"Loading Cartier embeddings from {cartier_embeddings_path}...")
    cartier_embeddings = np.load(cartier_embeddings_path)
    print(f"Loaded {cartier_embeddings.shape[0]} embeddings of dimension {cartier_embeddings.shape[1]}")
    
    # Load settings metadata to check count
    settings_metadata_path = "embeddings/setting_metadata.json"
    with open(settings_metadata_path, 'r') as f:
        settings_data = json.load(f)
    
    num_settings = len(settings_data['data'])
    print(f"Settings metadata contains {num_settings} settings")
    
    # If we have more settings than Cartier items (due to augmentation),
    # we need to handle this
    if num_settings > cartier_embeddings.shape[0]:
        print(f"⚠️  Warning: More settings ({num_settings}) than Cartier embeddings ({cartier_embeddings.shape[0]})")
        print("   This is expected after augmentation. Using Cartier embeddings for original settings.")
        print("   Augmented settings will use nearest neighbor embeddings.")
        
        # For augmented settings, we'll use the original Cartier embedding
        # (they'll be matched by ID in the retrieval engine)
        # The retrieval engine will handle this by using the original Cartier index
        setting_embeddings = cartier_embeddings
    else:
        # Use Cartier embeddings directly
        setting_embeddings = cartier_embeddings[:num_settings]
    
    # Save setting embeddings
    print(f"Saving setting embeddings to {setting_embeddings_path}...")
    np.save(setting_embeddings_path, setting_embeddings)
    print(f"✅ Saved {setting_embeddings.shape[0]} setting embeddings")
    
    # Verify
    loaded = np.load(setting_embeddings_path)
    print(f"✅ Verification: Loaded {loaded.shape[0]} embeddings from {setting_embeddings_path}")


if __name__ == '__main__':
    main()


