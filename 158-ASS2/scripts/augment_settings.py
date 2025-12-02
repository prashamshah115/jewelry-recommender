"""
Augment settings data with variations (metal, style, price variations).
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any
import copy


def augment_settings(settings_metadata_path: str) -> Dict[str, Any]:
    """
    Generate variations of Cartier settings.
    
    Creates:
    - Metal variations (same style, different metals)
    - Style variations (same metal, different styles)
    - Price variations (within reasonable ranges)
    """
    with open(settings_metadata_path, 'r') as f:
        settings_data = json.load(f)
    
    original_settings = settings_data['data']
    augmented_settings = []
    
    # Keep all original settings
    augmented_settings.extend(original_settings)
    
    # Metal variations: For each setting, create variations with different metals
    metals = ['yellow gold', 'white gold', 'pink gold', 'platinum']
    metal_price_multipliers = {
        'yellow gold': 1.0,
        'white gold': 1.1,
        'pink gold': 1.05,
        'platinum': 1.3
    }
    
    for setting in original_settings:
        original_metal = setting['metal']
        for metal in metals:
            if metal != original_metal:
                # Create variation
                variation = copy.deepcopy(setting)
                variation['id'] = f"{setting['id']}_metal_{metal.replace(' ', '_')}"
                variation['metal'] = metal
                # Adjust price based on metal
                if setting['price']:
                    base_price = setting['price']
                    variation['price'] = base_price * metal_price_multipliers.get(metal, 1.0)
                variation['name'] = f"{setting['name']} ({metal})"
                variation['description'] = setting['description'].replace(
                    original_metal, metal
                ) if original_metal in setting['description'] else setting['description']
                augmented_settings.append(variation)
    
    # Style variations: Common ring styles
    common_styles = ['solitaire', 'halo', 'hidden halo', 'cathedral', 'pavé', 'vintage', 'modern', 'classic']
    
    for setting in original_settings[:50]:  # Limit to avoid too many variations
        original_style = setting['style']
        for style in common_styles:
            if style != original_style and style not in setting['name'].lower():
                variation = copy.deepcopy(setting)
                variation['id'] = f"{setting['id']}_style_{style.replace(' ', '_')}"
                variation['style'] = style
                variation['name'] = f"{style.title()} {setting['name']}"
                augmented_settings.append(variation)
    
    # Price variations: Create budget and premium versions
    for setting in original_settings[:30]:  # Limit variations
        if setting['price'] and setting['price'] > 1000:
            # Budget version (70% of price)
            budget = copy.deepcopy(setting)
            budget['id'] = f"{setting['id']}_budget"
            budget['price'] = setting['price'] * 0.7
            budget['name'] = f"{setting['name']} (Budget)"
            augmented_settings.append(budget)
            
            # Premium version (150% of price)
            premium = copy.deepcopy(setting)
            premium['id'] = f"{setting['id']}_premium"
            premium['price'] = setting['price'] * 1.5
            premium['name'] = f"{setting['name']} (Premium)"
            augmented_settings.append(premium)
    
    # Synthetic common ring configurations
    # Note: These don't have image_path - frontend will use DEFAULT_RING_IMAGE
    synthetic_settings = [
        {
            'id': 'synthetic_solitaire_platinum',
            'name': 'Classic Solitaire Platinum',
            'metal': 'platinum',
            'style': 'solitaire',
            'band_width_mm': 2.0,
            'price': 3000.0,
            'description': 'Classic solitaire setting in platinum',
            'category': 'rings',
            'gemstones': [],
            'cartier_ref': 'SYNTHETIC',
            'image_path': '',  # Empty - will use default image
        },
        {
            'id': 'synthetic_halo_yellow_gold',
            'name': 'Halo Yellow Gold',
            'metal': 'yellow gold',
            'style': 'halo',
            'band_width_mm': 2.5,
            'price': 2500.0,
            'description': 'Halo setting in yellow gold',
            'category': 'rings',
            'gemstones': ['diamond'],
            'cartier_ref': 'SYNTHETIC',
            'image_path': '',  # Empty - will use default image
        },
        {
            'id': 'synthetic_vintage_rose_gold',
            'name': 'Vintage Rose Gold',
            'metal': 'pink gold',
            'style': 'vintage',
            'band_width_mm': 3.0,
            'price': 2800.0,
            'description': 'Vintage-inspired setting in rose gold',
            'category': 'rings',
            'gemstones': [],
            'cartier_ref': 'SYNTHETIC',
            'image_path': '',  # Empty - will use default image
        },
        {
            'id': 'synthetic_modern_white_gold',
            'name': 'Modern White Gold',
            'metal': 'white gold',
            'style': 'modern',
            'band_width_mm': 2.0,
            'price': 2200.0,
            'description': 'Modern minimalist setting in white gold',
            'category': 'rings',
            'gemstones': [],
            'cartier_ref': 'SYNTHETIC',
            'image_path': '',  # Empty - will use default image
        },
    ]
    
    augmented_settings.extend(synthetic_settings)
    
    # Calculate stats
    unique_metals = list(set(s['metal'] for s in augmented_settings))
    unique_styles = list(set(s['style'] for s in augmented_settings))
    prices = [s['price'] for s in augmented_settings if s['price'] and s['price'] > 0]
    
    stats = {
        'original_count': len(original_settings),
        'augmented_count': len(augmented_settings),
        'variations_added': len(augmented_settings) - len(original_settings),
        'unique_metals': unique_metals,
        'unique_styles': unique_styles,
        'price_range': {
            'min': min(prices) if prices else 0,
            'max': max(prices) if prices else 0,
        },
    }
    
    return {
        'data': augmented_settings,
        'stats': stats
    }


def save_augmented_settings(augmented_data: Dict[str, Any], output_path: str):
    """Save augmented settings metadata to JSON file."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(augmented_data, f, indent=2)


if __name__ == '__main__':
    # Augment settings
    settings_path = 'embeddings/setting_metadata.json'
    augmented_data = augment_settings(settings_path)
    
    # Save augmented settings
    output_path = 'embeddings/augmented_setting_metadata.json'
    save_augmented_settings(augmented_data, output_path)
    
    print(f"Original settings: {augmented_data['stats']['original_count']}")
    print(f"Augmented settings: {augmented_data['stats']['augmented_count']}")
    print(f"Variations added: {augmented_data['stats']['variations_added']}")
    print(f"Unique metals: {augmented_data['stats']['unique_metals']}")
    print(f"Unique styles: {augmented_data['stats']['unique_styles']}")
    print(f"Price range: ${augmented_data['stats']['price_range']['min']:.2f} - ${augmented_data['stats']['price_range']['max']:.2f}")
    print(f"Saved to: {output_path}")
    
    # Also update the main setting_metadata.json with augmented data
    save_augmented_settings(augmented_data, 'embeddings/setting_metadata.json')
    print("Updated embeddings/setting_metadata.json with augmented data")

