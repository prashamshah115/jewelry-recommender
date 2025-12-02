"""
Demo script showing example queries for the jewelry retrieval system.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedding_utils import load_siglip_model, embed_text, get_device
from retrieval_engine import load_retrieval_engine


def demo_text_query():
    """Demo: Text-only query."""
    print("=" * 60)
    print("DEMO 1: Text-Only Query")
    print("=" * 60)
    
    query_text = "hidden halo yellow gold thin band modern engagement ring"
    print(f"\nQuery: '{query_text}'")
    
    # Load model
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    
    # Embed query
    query_vec = embed_text(query_text, processor, model, device)
    print(f"Query embedding dimension: {len(query_vec)}")
    
    # Load retrieval engine
    try:
        engine = load_retrieval_engine("cartier", "embeddings")
        
        # Search
        results = engine.search(query_vec, top_k=5)
        
        print(f"\nFound {len(results)} results:\n")
        for i, result in enumerate(results, 1):
            metadata = result['metadata']
            print(f"{i}. {metadata.get('title', 'Unknown')}")
            print(f"   Price: ${metadata.get('price', 0):,.0f}")
            print(f"   Similarity: {result['score']:.3f}")
            if metadata.get('metals'):
                print(f"   Metal: {', '.join(metadata['metals'])}")
            print()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure embeddings are precomputed. Run:")
        print("  python scripts/precompute_cartier_embeddings.py")


def demo_diamond_query():
    """Demo: Diamond search query."""
    print("=" * 60)
    print("DEMO 2: Diamond Search Query")
    print("=" * 60)
    
    query_text = "1 carat round diamond E color VVS2 clarity excellent cut"
    print(f"\nQuery: '{query_text}'")
    
    # Load model
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    
    # Embed query
    query_vec = embed_text(query_text, processor, model, device)
    
    # Load retrieval engine
    try:
        engine = load_retrieval_engine("diamonds", "embeddings")
        
        # Search with filters
        filters = {
            'carat_min': 0.9,
            'carat_max': 1.1,
            'color': ['E', 'F'],
            'clarity': ['VVS2', 'VVS1']
        }
        
        results = engine.search(query_vec, top_k=5, filters=filters)
        
        print(f"\nFound {len(results)} results (with filters):\n")
        for i, result in enumerate(results, 1):
            metadata = result['metadata']
            print(f"{i}. {metadata.get('carat_weight', 0):.2f} carat {metadata.get('cut', 'Round')}")
            print(f"   {metadata.get('color', 'Unknown')} color, {metadata.get('clarity', 'Unknown')} clarity")
            print(f"   Price: ${metadata.get('price', 0):,.0f}")
            print(f"   Similarity: {result['score']:.3f}")
            print()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure embeddings are precomputed. Run:")
        print("  python scripts/precompute_diamond_embeddings.py")


def demo_filtered_query():
    """Demo: Query with filters."""
    print("=" * 60)
    print("DEMO 3: Filtered Query")
    print("=" * 60)
    
    query_text = "platinum wedding band with diamonds"
    print(f"\nQuery: '{query_text}'")
    print("Filters: Price $2000-$5000, Metal: platinum")
    
    # Load model
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    
    # Embed query
    query_vec = embed_text(query_text, processor, model, device)
    
    # Load retrieval engine
    try:
        engine = load_retrieval_engine("cartier", "embeddings")
        
        # Search with filters
        filters = {
            'price_min': 2000,
            'price_max': 5000,
            'metal': ['platinum']
        }
        
        results = engine.search(query_vec, top_k=5, filters=filters)
        
        print(f"\nFound {len(results)} results:\n")
        for i, result in enumerate(results, 1):
            metadata = result['metadata']
            print(f"{i}. {metadata.get('title', 'Unknown')}")
            print(f"   Price: ${metadata.get('price', 0):,.0f}")
            print(f"   Metal: {', '.join(metadata.get('metals', []))}")
            print(f"   Similarity: {result['score']:.3f}")
            print()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("JEWELRY RETRIEVAL SYSTEM - DEMO QUERIES")
    print("=" * 60 + "\n")
    
    try:
        demo_text_query()
        print("\n")
        demo_diamond_query()
        print("\n")
        demo_filtered_query()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user.")
    except Exception as e:
        print(f"\n\nError running demo: {e}")
        print("\nMake sure you have:")
        print("1. Installed all dependencies (pip install -r requirements.txt)")
        print("2. Precomputed embeddings (run precompute scripts)")
        print("3. Have sufficient memory/GPU for model loading")



