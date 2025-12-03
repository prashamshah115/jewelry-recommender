"""
Extract settings from Cartier items for use in personalized recommendations.
"""

import json
from pathlib import Path
from typing import Dict, List, Any


def extract_settings_from_cartier(cartier_metadata_path: str) -> Dict[str, Any]:
    """
    Extract setting attributes from Cartier metadata.
    
    Args:
        cartier_metadata_path: Path to cartier_metadata.json
        
    Returns:
        Dictionary with 'data' (list of settings) and 'stats'
    """
    with open(cartier_metadata_path, 'r') as f:
        cartier_data = json.load(f)
    
    settings = []
    
    for item in cartier_data['data']:
        setting = {
            'id': item.get('id', ''),
            'name': item.get('title', 'Unknown Setting'),
            'metal': item.get('metals', ['unknown'])[0] if item.get('metals') else 'unknown',
            'style': item.get('styles', ['signature'])[0] if item.get('styles') else 'signature',
            'band_width_mm': item.get('band_width_mm'),
            'price': item.get('price', 0.0),
            'image_path': item.get('image_path', ''),
            'description': item.get('description', ''),
            'category': item.get('category', 'rings'),
            'gemstones': item.get('gemstones', []),
            # Keep original Cartier ref for reference
            'cartier_ref': item.get('ref', ''),
        }
        settings.append(setting)
    
    # Calculate stats
    unique_metals = list(set(s['metal'] for s in settings))
    unique_styles = list(set(s['style'] for s in settings))
    prices = [s['price'] for s in settings if s['price'] and s['price'] > 0]
    
    stats = {
        'total_settings': len(settings),
        'unique_metals': unique_metals,
        'unique_styles': unique_styles,
        'price_range': {
            'min': min(prices) if prices else 0,
            'max': max(prices) if prices else 0,
        },
    }
    
    return {
        'data': settings,
        'stats': stats
    }


def save_settings_metadata(settings_data: Dict[str, Any], output_path: str):
    """Save settings metadata to JSON file."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(settings_data, f, indent=2)


if __name__ == '__main__':
    # Extract settings from Cartier metadata
    cartier_path = 'embeddings/cartier_metadata.json'
    settings_data = extract_settings_from_cartier(cartier_path)
    
    # Save settings metadata
    output_path = 'embeddings/setting_metadata.json'
    save_settings_metadata(settings_data, output_path)
    
    print(f"Extracted {settings_data['stats']['total_settings']} settings")
    print(f"Unique metals: {settings_data['stats']['unique_metals']}")
    print(f"Unique styles: {settings_data['stats']['unique_styles']}")
    print(f"Price range: ${settings_data['stats']['price_range']['min']:.2f} - ${settings_data['stats']['price_range']['max']:.2f}")
    print(f"Saved to: {output_path}")


