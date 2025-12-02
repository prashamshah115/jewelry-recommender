"""
Data preprocessing utilities for Cartier catalog and Diamonds datasets.
Extracts structured attributes, validates data, and generates metadata.
"""

import pandas as pd
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional


def extract_band_width(description: str) -> Optional[float]:
    """Extract band width from description in mm."""
    # Look for patterns like "Width: 5.5mm", "width 3.6mm", etc.
    patterns = [
        r'[Ww]idth[:\s]+(\d+\.?\d*)\s*mm',
        r'(\d+\.?\d*)\s*mm[^a-z]*width',
    ]
    for pattern in patterns:
        match = re.search(pattern, description)
        if match:
            return float(match.group(1))
    return None


def extract_metal_type(tags: str, description: str) -> List[str]:
    """Extract metal types from tags and description."""
    metals = []
    text = (tags + " " + description).lower()
    
    metal_keywords = {
        'yellow gold': ['yellow gold', '18k yellow gold'],
        'white gold': ['white gold', '18k white gold', 'rhodiumized'],
        'pink gold': ['pink gold', 'rose gold', '18k pink gold', '18k rose gold'],
        'platinum': ['platinum', '950/1000 platinum', '950‰ platinum'],
    }
    
    for metal, keywords in metal_keywords.items():
        if any(kw in text for kw in keywords):
            metals.append(metal)
    
    return metals if metals else ['unknown']


def extract_gemstones(tags: str, description: str) -> List[str]:
    """Extract gemstone types from tags and description."""
    gemstones = []
    text = (tags + " " + description).lower()
    
    gemstone_keywords = [
        'diamond', 'sapphire', 'emerald', 'ruby', 'garnet', 
        'amethyst', 'onyx', 'tsavorite', 'carnelian', 'chrysoprase',
        'lapis lazuli', 'mother-of-pearl', 'coral', 'ceramic'
    ]
    
    for gem in gemstone_keywords:
        if gem in text:
            gemstones.append(gem)
    
    return gemstones


def extract_style_keywords(title: str, description: str) -> List[str]:
    """Extract style keywords from title and description."""
    text = (title + " " + description).lower()
    styles = []
    
    style_keywords = [
        'solitaire', 'halo', 'hidden halo', 'cathedral', 'pave', 'pavé',
        'diamond-paved', 'wedding band', 'engagement', 'vintage', 'modern',
        'classic', 'art deco', 'minimalist', 'ornate'
    ]
    
    for style in style_keywords:
        if style in text:
            styles.append(style)
    
    return styles


def process_cartier_catalog(csv_path: str) -> Dict[str, Any]:
    """
    Process Cartier catalog CSV and extract structured metadata.
    
    Returns:
        Dictionary with 'data' (list of processed items) and 'stats'
    """
    # Read CSV with error handling for malformed rows
    try:
        df = pd.read_csv(csv_path, on_bad_lines='skip', engine='python', quoting=1)
    except Exception:
        # Fallback: read with more lenient parsing
        try:
            df = pd.read_csv(csv_path, on_bad_lines='skip', engine='python')
        except Exception as e:
            # Last resort: read line by line and fix issues
            import csv
            rows = []
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader)
                for row in reader:
                    if len(row) >= len(header):
                        rows.append(row[:len(header)])
            df = pd.DataFrame(rows, columns=header)
    
    processed_items = []
    
    for idx, row in df.iterrows():
        item = {
            'id': str(row['ref']).strip(),
            'ref': str(row['ref']).strip(),
            'title': str(row['title']),
            'price': float(row['price']) if pd.notna(row['price']) else None,
            'category': str(row['categorie']),
            'tags': str(row['tags']) if pd.notna(row['tags']) else '',
            'description': str(row['description']) if pd.notna(row['description']) else '',
            'image_path': str(row['image']) if pd.notna(row['image']) else '',
        }
        
        # Extract structured attributes
        item['band_width_mm'] = extract_band_width(item['description'])
        item['metals'] = extract_metal_type(item['tags'], item['description'])
        item['gemstones'] = extract_gemstones(item['tags'], item['description'])
        item['styles'] = extract_style_keywords(item['title'], item['description'])
        
        # Check if image path exists (will be validated later)
        item['has_image'] = bool(item['image_path'])
        
        processed_items.append(item)
    
    stats = {
        'total_items': len(processed_items),
        'items_with_price': sum(1 for item in processed_items if item['price'] is not None),
        'items_with_images': sum(1 for item in processed_items if item['has_image']),
        'price_range': {
            'min': min(item['price'] for item in processed_items if item['price'] is not None),
            'max': max(item['price'] for item in processed_items if item['price'] is not None),
        } if any(item['price'] for item in processed_items) else None,
        'unique_metals': list(set(metal for item in processed_items for metal in item['metals'])),
        'unique_gemstones': list(set(gem for item in processed_items for gem in item['gemstones'])),
    }
    
    return {
        'data': processed_items,
        'stats': stats
    }


def process_diamonds(csv_path: str) -> Dict[str, Any]:
    """
    Process diamonds CSV and extract structured metadata.
    
    Returns:
        Dictionary with 'data' (list of processed items) and 'stats'
    """
    df = pd.read_csv(csv_path)
    
    # Handle missing values
    df = df.fillna({
        'cut': 'Unknown',
        'color': 'Unknown',
        'clarity': 'Unknown',
        'carat_weight': 0.0,
        'cut_quality': 'Unknown',
        'lab': 'Unknown',
        'symmetry': 'Unknown',
        'polish': 'Unknown',
        'total_sales_price': 0.0,
    })
    
    processed_items = []
    
    for idx, row in df.iterrows():
        item = {
            'id': str(idx),  # Use index as ID
            'cut': str(row['cut']),
            'color': str(row['color']),
            'clarity': str(row['clarity']),
            'carat_weight': float(row['carat_weight']) if pd.notna(row['carat_weight']) else 0.0,
            'cut_quality': str(row['cut_quality']),
            'lab': str(row['lab']),
            'symmetry': str(row['symmetry']),
            'polish': str(row['polish']),
            'eye_clean': str(row['eye_clean']) if pd.notna(row['eye_clean']) else 'unknown',
            'depth_percent': float(row['depth_percent']) if pd.notna(row['depth_percent']) and row['depth_percent'] != 0.0 else None,
            'table_percent': float(row['table_percent']) if pd.notna(row['table_percent']) and row['table_percent'] != 0.0 else None,
            'meas_length': float(row['meas_length']) if pd.notna(row['meas_length']) and row['meas_length'] != 0.0 else None,
            'meas_width': float(row['meas_width']) if pd.notna(row['meas_width']) and row['meas_width'] != 0.0 else None,
            'meas_depth': float(row['meas_depth']) if pd.notna(row['meas_depth']) and row['meas_depth'] != 0.0 else None,
            'price': float(row['total_sales_price']) if pd.notna(row['total_sales_price']) else 0.0,
            'fluor_color': str(row['fluor_color']) if pd.notna(row['fluor_color']) else 'None',
            'fluor_intensity': str(row['fluor_intensity']) if pd.notna(row['fluor_intensity']) else 'None',
        }
        
        # Determine shape (cut field often contains shape info)
        item['shape'] = item['cut']  # In this dataset, 'cut' appears to be the shape
        
        processed_items.append(item)
    
    # Calculate stats
    valid_prices = [item['price'] for item in processed_items if item['price'] > 0]
    valid_carats = [item['carat_weight'] for item in processed_items if item['carat_weight'] > 0]
    
    stats = {
        'total_items': len(processed_items),
        'items_with_price': len(valid_prices),
        'items_with_carat': len(valid_carats),
        'price_range': {
            'min': min(valid_prices) if valid_prices else 0,
            'max': max(valid_prices) if valid_prices else 0,
        },
        'carat_range': {
            'min': min(valid_carats) if valid_carats else 0,
            'max': max(valid_carats) if valid_carats else 0,
        },
        'unique_shapes': list(df['cut'].unique()),
        'unique_colors': list(df['color'].unique()),
        'unique_clarities': list(df['clarity'].unique()),
    }
    
    return {
        'data': processed_items,
        'stats': stats
    }


def save_metadata(data: Dict[str, Any], output_path: str):
    """Save processed metadata to JSON file."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)


if __name__ == '__main__':
    # Process Cartier catalog
    print("Processing Cartier catalog...")
    cartier_data = process_cartier_catalog('cartier_catalog.csv')
    save_metadata(cartier_data, 'embeddings/cartier_metadata.json')
    print(f"Processed {cartier_data['stats']['total_items']} Cartier items")
    print(f"Stats: {json.dumps(cartier_data['stats'], indent=2)}")
    
    # Process Diamonds
    print("\nProcessing Diamonds dataset...")
    diamonds_data = process_diamonds('diamonds.csv')
    save_metadata(diamonds_data, 'embeddings/diamond_metadata.json')
    print(f"Processed {diamonds_data['stats']['total_items']} diamonds")
    print(f"Price range: ${diamonds_data['stats']['price_range']['min']:.2f} - ${diamonds_data['stats']['price_range']['max']:.2f}")
    print(f"Carat range: {diamonds_data['stats']['carat_range']['min']:.2f} - {diamonds_data['stats']['carat_range']['max']:.2f} carats")

