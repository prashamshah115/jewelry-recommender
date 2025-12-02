"""
API utility functions.
"""

from typing import Dict, Any, Optional
import json


def format_results(results: list, include_metadata: bool = True) -> list:
    """
    Format search results for API response.
    
    Args:
        results: List of result dictionaries from retrieval engine
        include_metadata: Whether to include full metadata
        
    Returns:
        Formatted list of results
    """
    formatted = []
    for result in results:
        item = {
            "id": result.get("id"),
            "similarity_score": result.get("score", 0.0),
        }
        
        if include_metadata:
            item["metadata"] = result.get("metadata", {})
        
        formatted.append(item)
    
    return formatted


def parse_filters(filters_str: Optional[str]) -> Dict[str, Any]:
    """
    Parse filter string from query parameters.
    
    Args:
        filters_str: JSON string of filters
        
    Returns:
        Dictionary of filters
    """
    if not filters_str:
        return {}
    
    try:
        return json.loads(filters_str)
    except json.JSONDecodeError:
        return {}


def validate_query(query_text: Optional[str], image_bytes: Optional[bytes]) -> bool:
    """
    Validate that at least one query input is provided.
    
    Args:
        query_text: Optional text query
        image_bytes: Optional image bytes
        
    Returns:
        True if valid, False otherwise
    """
    return query_text is not None or image_bytes is not None



