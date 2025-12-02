"""
FastAPI backend for jewelry retrieval system.
"""

# Fix OpenMP library conflict (FAISS + PyTorch)
import os
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')
os.environ.setdefault('OMP_NUM_THREADS', '1')  # Force single-threaded OpenMP

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, List, Dict, Any
import sys
from pathlib import Path
import json
import threading
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedding_utils import load_siglip_model, embed_query, get_device
from retrieval_engine import load_retrieval_engine
from personalized_recommender import PersonalizedRecommender
from user_vector_manager import UserVectorManager
from collaborative_filtering import CollaborativeFiltering

app = FastAPI(title="Jewelry Retrieval API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static images if they exist
images_dir = Path(__file__).parent.parent / "data" / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

# Global variables for loaded models and engines
processor = None
model = None
device = None
cartier_engine = None
diamonds_engine = None
settings_engine = None
user_vector_manager = None
collaborative_filtering = None
_engine_lock = threading.Lock()  # For thread-safe lazy loading


def get_engine(dataset: str):
    """Get or load retrieval engine lazily."""
    global cartier_engine, diamonds_engine, settings_engine
    
    # Get absolute path to embeddings directory (relative to project root)
    project_root = Path(__file__).parent.parent
    embeddings_dir = str(project_root / "embeddings")
    
    if dataset == "cartier":
        if cartier_engine is None:
            with _engine_lock:
                if cartier_engine is None:  # Double-check pattern
                    print(f"Loading {dataset} engine (lazy load)...")
                    cartier_engine = load_retrieval_engine("cartier", embeddings_dir)
                    print(f"Loaded Cartier engine: {cartier_engine.get_stats()}")
        return cartier_engine
    elif dataset == "diamonds":
        if diamonds_engine is None:
            with _engine_lock:
                if diamonds_engine is None:  # Double-check pattern
                    print(f"Loading {dataset} engine (lazy load)...")
                    diamonds_engine = load_retrieval_engine("diamonds", embeddings_dir)
                    print(f"Loaded Diamonds engine: {diamonds_engine.get_stats()}")
        return diamonds_engine
    elif dataset == "settings":
        if settings_engine is None:
            with _engine_lock:
                if settings_engine is None:  # Double-check pattern
                    print(f"Loading {dataset} engine (lazy load)...")
                    settings_engine = load_retrieval_engine("settings", embeddings_dir)
                    print(f"Loaded Settings engine: {settings_engine.get_stats()}")
        return settings_engine
    else:
        raise ValueError(f"Unknown dataset: {dataset}")


@app.on_event("startup")
async def startup_event():
    """Load models on startup (engines load lazily on first use)."""
    global processor, model, device, user_vector_manager
    
    print("Loading SigLIP model...")
    processor, model = load_siglip_model("google/siglip-base-patch16-224")
    device = get_device()
    
    # Initialize user vector manager
    print("Initializing user vector manager...")
    global user_vector_manager
    user_vector_manager = UserVectorManager(
        storage_path="data/user_vectors.json",
        processor=processor,
        model=model,
        device=device
    )
    
    # Initialize collaborative filtering
    print("Initializing collaborative filtering...")
    global collaborative_filtering
    collaborative_filtering = CollaborativeFiltering(
        user_vectors_path="data/user_vectors.json"
    )
    
    print("API ready! (Engines will load on first query)")
    # NOTE: Engines load lazily when first queried


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "cartier_engine_loaded": cartier_engine is not None,
        "diamonds_engine_loaded": diamonds_engine is not None,
    }


@app.get("/api/stats")
async def get_stats():
    """Get statistics about loaded datasets."""
    stats = {
        "model": {
            "device": str(device) if device else None,
        }
    }
    
    if cartier_engine:
        stats["cartier"] = cartier_engine.get_stats()
    
    if diamonds_engine:
        stats["diamonds"] = diamonds_engine.get_stats()
    
    return stats


@app.post("/api/recommend")
async def recommend(
    query_text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    dataset: str = Form("cartier"),  # "cartier" or "diamonds"
    top_k: int = Form(10),
    price_min: Optional[float] = Form(None),
    price_max: Optional[float] = Form(None),
    metal: Optional[str] = Form(None),  # Comma-separated for multiple
    style: Optional[str] = Form(None),  # Comma-separated for multiple (for cartier)
    shape: Optional[str] = Form(None),  # Comma-separated for multiple
    color: Optional[str] = Form(None),  # For diamonds
    clarity: Optional[str] = Form(None),  # For diamonds
    carat_min: Optional[float] = Form(None),  # For diamonds
    carat_max: Optional[float] = Form(None),  # For diamonds
):
    """
    Main recommendation endpoint.
    
    Supports text-only, image-only, or multimodal queries.
    """
    # Validate inputs
    if not query_text and not image:
        raise HTTPException(
            status_code=400, 
            detail="Either query_text or image must be provided"
        )
    
    if dataset not in ["cartier", "diamonds", "personalized"]:
        raise HTTPException(
            status_code=400, 
            detail=f"dataset must be 'cartier', 'diamonds', or 'personalized', got '{dataset}'"
        )
    
    if top_k < 1 or top_k > 100:
        raise HTTPException(
            status_code=400,
            detail=f"top_k must be between 1 and 100, got {top_k}"
        )
    
    # Read image bytes if provided
    image_bytes = None
    if image:
        image_bytes = await image.read()
    
    # Embed query
    try:
        if processor is None or model is None:
            raise HTTPException(
                status_code=503,
                detail="Model not loaded. Please check server logs."
            )
        query_vec = embed_query(query_text, image_bytes, processor, model, device)
        if query_vec is None:
            raise HTTPException(
                status_code=400, 
                detail="Failed to generate query embedding. Please provide valid text or image input."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error embedding query: {str(e)}"
        )
    
    # Handle personalized recommendations
    if dataset == "personalized":
        return await handle_personalized_recommendation(
            query_vec=query_vec,
            top_k=top_k,
            price_min=price_min,
            price_max=price_max,
            metal=metal,
            style=style,
            shape=shape,
            color=color,
            clarity=clarity,
            carat_min=carat_min,
            carat_max=carat_max,
            user_id=None,  # TODO: Add user_id parameter
            query_text=query_text,
            has_image_query=image_bytes is not None
        )
    
    # Build filters
    filters = {}
    if price_min is not None:
        filters['price_min'] = price_min
    if price_max is not None:
        filters['price_max'] = price_max
    
    if dataset == "cartier":
        if metal:
            filters['metal'] = [m.strip() for m in metal.split(',')]
        if style:
            filters['style'] = [s.strip() for s in style.split(',')]
    elif dataset == "diamonds":
        if shape:
            filters['shape'] = [s.strip() for s in shape.split(',')]
        if color:
            filters['color'] = [c.strip() for c in color.split(',')]
        if clarity:
            filters['clarity'] = [c.strip() for c in clarity.split(',')]
        if carat_min is not None:
            filters['carat_min'] = carat_min
        if carat_max is not None:
            filters['carat_max'] = carat_max
    
    # Get the appropriate engine for the dataset
    engine = get_engine(dataset)
    
    # Search
    try:
        results = engine.search(query_vec, top_k=top_k, filters=filters if filters else None)
        if not results:
            # Return empty results rather than error
            return {
                "results": [],
                "query_info": {
                    "query_type": "multimodal" if (query_text and image_bytes) else ("text" if query_text else "image"),
                    "dataset": dataset,
                    "num_results": 0,
                    "embedding_dim": len(query_vec),
                    "message": "No results found matching your query and filters. Try adjusting your search criteria."
                }
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error during search: {str(e)}"
        )
    
    # Format results
    formatted_results = []
    for result in results:
        formatted_result = {
            "id": result['id'],
            "similarity_score": result['score'],
            "metadata": result['metadata']
        }
        formatted_results.append(formatted_result)
    
    return {
        "results": formatted_results,
        "query_info": {
            "query_type": "multimodal" if (query_text and image_bytes) else ("text" if query_text else "image"),
            "dataset": dataset,
            "num_results": len(formatted_results),
            "embedding_dim": len(query_vec)
        }
    }


async def handle_personalized_recommendation(
    query_vec: np.ndarray,
    top_k: int,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    metal: Optional[str] = None,
    style: Optional[str] = None,
    shape: Optional[str] = None,
    color: Optional[str] = None,
    clarity: Optional[str] = None,
    carat_min: Optional[float] = None,
    carat_max: Optional[float] = None,
    user_id: Optional[str] = None,
    query_text: Optional[str] = None,
    has_image_query: bool = False
):
    """Handle personalized diamond + setting recommendations."""
    global diamonds_engine, settings_engine, user_vector_manager
    
    # Get engines
    try:
        diamond_engine = get_engine("diamonds")
        setting_engine = get_engine("settings")
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to load engines: {str(e)}"
        )
    
    # Build filters
    diamond_filters = {}
    setting_filters = {}
    
    if price_min is not None or price_max is not None:
        diamond_filters['price_min'] = price_min
        diamond_filters['price_max'] = price_max
        setting_filters['price_min'] = price_min
        setting_filters['price_max'] = price_max
    
    if shape:
        diamond_filters['shape'] = [s.strip() for s in shape.split(',')]
    if color:
        diamond_filters['color'] = [c.strip() for c in color.split(',')]
    if clarity:
        diamond_filters['clarity'] = [c.strip() for c in clarity.split(',')]
    if carat_min is not None:
        diamond_filters['carat_min'] = carat_min
    if carat_max is not None:
        diamond_filters['carat_max'] = carat_max
    
    if metal:
        setting_filters['metal'] = [m.strip() for m in metal.split(',')]
    if style:
        setting_filters['style'] = [s.strip() for s in style.split(',')]
    
    # Initialize personalized recommender with collaborative filtering
    global collaborative_filtering
    recommender = PersonalizedRecommender(
        diamond_engine=diamond_engine,
        setting_engine=setting_engine,
        user_vector_manager=user_vector_manager,
        collaborative_filtering=collaborative_filtering,
        use_sequential=True,
        diversity_weight=0.1
    )
    
    # Get recommendations
    try:
        combinations = recommender.recommend_combinations(
            query_vec=query_vec,
            top_k=top_k,
            user_id=user_id,
            diamond_filters=diamond_filters if diamond_filters else None,
            setting_filters=setting_filters if setting_filters else None,
            query_text=query_text,
            has_image_query=has_image_query
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating personalized recommendations: {str(e)}"
        )
    
    if not combinations:
        return {
            "results": [],
            "query_info": {
                "query_type": "personalized",
                "dataset": "personalized",
                "num_results": 0,
                "embedding_dim": len(query_vec),
                "message": "No combinations found matching your query and filters."
            }
        }
    
    # Format results
    formatted_results = []
    for combo in combinations:
        formatted_results.append({
            "diamond": combo['diamond']['metadata'],
            "setting": combo['setting']['metadata'],
            "combination_score": combo['combination_score'],
            "total_price": combo['total_price'],
            "score_breakdown": combo.get('score_breakdown', {})
        })
    
    return {
        "results": formatted_results,
        "query_info": {
            "query_type": "personalized",
            "dataset": "personalized",
            "num_results": len(formatted_results),
            "embedding_dim": len(query_vec),
            "user_id": user_id
        }
    }


@app.post("/api/user/preferences")
async def update_user_preferences(
    user_id: str = Form(...),
    metal: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    price_min: Optional[float] = Form(None),
    price_max: Optional[float] = Form(None),
    diamond_color: Optional[str] = Form(None),
    diamond_shape: Optional[str] = Form(None),
):
    """Update user preferences."""
    global user_vector_manager
    
    if user_vector_manager is None:
        raise HTTPException(
            status_code=503,
            detail="User vector manager not initialized"
        )
    
    preferences = {}
    if metal:
        preferences['metal'] = metal
    if style:
        preferences['style'] = style
    if price_min is not None and price_max is not None:
        preferences['price_range'] = [price_min, price_max]
    if diamond_color:
        preferences['diamond_color'] = diamond_color
    if diamond_shape:
        preferences['diamond_shape'] = diamond_shape
    
    user_vector_manager.update_from_preferences(user_id, preferences)
    
    return {
        "status": "success",
        "user_id": user_id,
        "preferences": preferences
    }


@app.post("/api/user/interactions")
async def log_user_interaction(
    user_id: str = Form(...),
    item_id: str = Form(...),
    item_type: str = Form(...),  # "diamond" or "setting"
    interaction_type: str = Form("click"),  # "click", "like", "purchase"
):
    """Log user interaction for personalization."""
    global user_vector_manager, diamonds_engine, settings_engine
    
    if user_vector_manager is None:
        raise HTTPException(
            status_code=503,
            detail="User vector manager not initialized"
        )
    
    # Get item embedding
    try:
        if item_type == "diamond":
            engine = get_engine("diamonds")
        elif item_type == "setting":
            engine = get_engine("settings")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"item_type must be 'diamond' or 'setting', got '{item_type}'"
            )
        
        # Find item in metadata
        item_idx = None
        for idx, item in enumerate(engine.metadata):
            if str(item.get('id', '')) == str(item_id):
                item_idx = idx
                break
        
        if item_idx is None:
            raise HTTPException(
                status_code=404,
                detail=f"Item {item_id} not found in {item_type} dataset"
            )
        
        # Get embedding
        item_embedding = engine.embeddings[item_idx]
        
        # Determine weight based on interaction type
        weights = {
            'click': 1.0,
            'like': 2.0,
            'purchase': 5.0
        }
        weight = weights.get(interaction_type, 1.0)
        
        # Log interaction in user vector manager
        user_vector_manager.log_interaction(
            user_id=user_id,
            item_embedding=item_embedding,
            interaction_type=interaction_type,
            weight=weight
        )
        
        # Also log in collaborative filtering
        global collaborative_filtering
        if collaborative_filtering:
            collaborative_filtering.update_interaction(
                user_id=user_id,
                item_id=item_id,
                interaction_type=interaction_type
            )
        
        # Update user data with item_id for future reference
        if user_id in user_vector_manager.user_data:
            # Add item_id to the last interaction
            interactions = user_vector_manager.user_data[user_id].get('interactions', [])
            if interactions:
                interactions[-1]['item_id'] = item_id
                user_vector_manager._save_user_data()
        
        return {
            "status": "success",
            "user_id": user_id,
            "item_id": item_id,
            "interaction_type": interaction_type
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error logging interaction: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

