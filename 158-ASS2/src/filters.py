"""
Filtering logic for Cartier, Diamonds, and Settings datasets.
Applies attribute-based filters before retrieval.
"""

from typing import List, Dict, Any, Optional


def filter_cartier_by_attributes(
    metadata: List[Dict[str, Any]],
    filters: Dict[str, Any]
) -> List[int]:
    """
    Filter Cartier items by attributes.
    
    Args:
        metadata: List of Cartier item metadata dictionaries
        filters: Dictionary with filter criteria:
            - price_min: Minimum price
            - price_max: Maximum price
            - metal: List of metal types to include
            - gemstones: List of gemstones to include
            - styles: List of styles to include
            - band_width_min: Minimum band width in mm
            - band_width_max: Maximum band width in mm
            
    Returns:
        List of indices that pass all filters
    """
    valid_indices = []
    
    for idx, item in enumerate(metadata):
        # Price filter
        if 'price_min' in filters and item.get('price') is not None:
            if item['price'] < filters['price_min']:
                continue
        
        if 'price_max' in filters and item.get('price') is not None:
            if item['price'] > filters['price_max']:
                continue
        
        # Metal filter
        if 'metal' in filters and filters['metal']:
            item_metals = item.get('metals', [])
            if not any(m in item_metals for m in filters['metal']):
                continue
        
        # Gemstone filter
        if 'gemstones' in filters and filters['gemstones']:
            item_gemstones = item.get('gemstones', [])
            if not any(g in item_gemstones for g in filters['gemstones']):
                continue
        
        # Style filter
        if 'styles' in filters and filters['styles']:
            item_styles = item.get('styles', [])
            if not any(s in item_styles for s in filters['styles']):
                continue
        
        # Band width filter
        if 'band_width_min' in filters and item.get('band_width_mm') is not None:
            if item['band_width_mm'] < filters['band_width_min']:
                continue
        
        if 'band_width_max' in filters and item.get('band_width_mm') is not None:
            if item['band_width_mm'] > filters['band_width_max']:
                continue
        
        valid_indices.append(idx)
    
    return valid_indices


def filter_diamonds_by_attributes(
    metadata: List[Dict[str, Any]],
    filters: Dict[str, Any]
) -> List[int]:
    """
    Filter diamonds by attributes.
    
    Args:
        metadata: List of diamond metadata dictionaries
        filters: Dictionary with filter criteria:
            - price_min: Minimum price
            - price_max: Maximum price
            - carat_min: Minimum carat weight
            - carat_max: Maximum carat weight
            - color: List of colors to include
            - clarity: List of clarities to include
            - cut: List of cut types to include
            - shape: List of shapes to include
            - lab: List of labs to include
            
    Returns:
        List of indices that pass all filters
    """
    valid_indices = []
    
    for idx, item in enumerate(metadata):
        # Price filter
        if 'price_min' in filters and item.get('price', 0) > 0:
            if item['price'] < filters['price_min']:
                continue
        
        if 'price_max' in filters and item.get('price', 0) > 0:
            if item['price'] > filters['price_max']:
                continue
        
        # Carat filter
        if 'carat_min' in filters and item.get('carat_weight', 0) > 0:
            if item['carat_weight'] < filters['carat_min']:
                continue
        
        if 'carat_max' in filters and item.get('carat_weight', 0) > 0:
            if item['carat_weight'] > filters['carat_max']:
                continue
        
        # Color filter
        if 'color' in filters and filters['color']:
            if item.get('color', 'Unknown') not in filters['color']:
                continue
        
        # Clarity filter
        if 'clarity' in filters and filters['clarity']:
            if item.get('clarity', 'Unknown') not in filters['clarity']:
                continue
        
        # Cut filter
        if 'cut' in filters and filters['cut']:
            if item.get('cut', 'Unknown') not in filters['cut']:
                continue
        
        # Shape filter (often same as cut in this dataset)
        if 'shape' in filters and filters['shape']:
            if item.get('shape', 'Unknown') not in filters['shape']:
                continue
        
        # Lab filter
        if 'lab' in filters and filters['lab']:
            if item.get('lab', 'Unknown') not in filters['lab']:
                continue
        
        valid_indices.append(idx)
    
    return valid_indices


def filter_settings_by_attributes(
    metadata: List[Dict[str, Any]],
    filters: Dict[str, Any]
) -> List[int]:
    """
    Filter settings by attributes.
    
    Args:
        metadata: List of setting metadata dictionaries
        filters: Dictionary with filter criteria:
            - price_min: Minimum price
            - price_max: Maximum price
            - metal: List of metal types to include
            - style: List of styles to include (or single string)
            - band_width_min: Minimum band width in mm
            - band_width_max: Maximum band width in mm
            - gemstones: List of gemstones to include
            
    Returns:
        List of indices that pass all filters
    """
    valid_indices = []
    
    for idx, item in enumerate(metadata):
        # Price filter
        if 'price_min' in filters and item.get('price') is not None:
            if item['price'] < filters['price_min']:
                continue
        
        if 'price_max' in filters and item.get('price') is not None:
            if item['price'] > filters['price_max']:
                continue
        
        # Metal filter (settings have metal as string, not list)
        if 'metal' in filters and filters['metal']:
            item_metal = item.get('metal', '')
            # Convert to lowercase for comparison
            item_metal_lower = item_metal.lower()
            filter_metals = [m.lower() for m in filters['metal']]
            if not any(m in item_metal_lower for m in filter_metals):
                continue
        
        # Style filter (settings have style as string, not list)
        if 'style' in filters and filters['style']:
            item_style = item.get('style', '')
            # Handle both list and string filters
            if isinstance(filters['style'], list):
                if item_style not in filters['style']:
                    continue
            else:
                if item_style != filters['style']:
                    continue
        
        # Band width filter
        if 'band_width_min' in filters and item.get('band_width_mm') is not None:
            if item['band_width_mm'] < filters['band_width_min']:
                continue
        
        if 'band_width_max' in filters and item.get('band_width_mm') is not None:
            if item['band_width_mm'] > filters['band_width_max']:
                continue
        
        # Gemstone filter
        if 'gemstones' in filters and filters['gemstones']:
            item_gemstones = item.get('gemstones', [])
            if not any(g in item_gemstones for g in filters['gemstones']):
                continue
        
        valid_indices.append(idx)
    
    return valid_indices

