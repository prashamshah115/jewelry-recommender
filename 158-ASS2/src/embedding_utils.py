"""
Core embedding utilities for SigLIP model.
Handles text and image embeddings, model loading, and embedding fusion.
"""

import torch
import numpy as np
from PIL import Image
from transformers import AutoProcessor, AutoModel
from typing import Optional, Tuple, List
import io


def load_siglip_model(model_name: str = "google/siglip-base-patch16-224") -> Tuple[AutoProcessor, AutoModel]:
    """
    Load SigLIP model and processor.
    
    Args:
        model_name: HuggingFace model identifier
        
    Returns:
        Tuple of (processor, model)
    """
    print(f"Loading SigLIP model: {model_name}")
    processor = AutoProcessor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()
    
    # Move to GPU if available
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    print(f"Model loaded on device: {device}")
    
    return processor, model


def get_device() -> torch.device:
    """Get the appropriate device (CPU or GPU)."""
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def embed_text(
    text: str,
    processor: AutoProcessor,
    model: AutoModel,
    device: Optional[torch.device] = None
) -> np.ndarray:
    """
    Generate normalized text embedding.
    
    Args:
        text: Input text string
        processor: SigLIP processor
        model: SigLIP model
        device: Torch device (auto-detected if None)
        
    Returns:
        Normalized embedding vector (numpy array)
    """
    if device is None:
        device = get_device()
    
    inputs = processor(text=[text], return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.get_text_features(**inputs)
    
    # Normalize
    embedding = outputs[0].cpu().numpy()
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    return embedding


def embed_image(
    image_path: str,
    processor: AutoProcessor,
    model: AutoModel,
    device: Optional[torch.device] = None
) -> Optional[np.ndarray]:
    """
    Generate normalized image embedding from file path.
    
    Args:
        image_path: Path to image file
        processor: SigLIP processor
        model: SigLIP model
        device: Torch device (auto-detected if None)
        
    Returns:
        Normalized embedding vector (numpy array) or None if image not found
    """
    if device is None:
        device = get_device()
    
    try:
        image = Image.open(image_path).convert("RGB")
    except (FileNotFoundError, IOError) as e:
        print(f"Warning: Could not load image {image_path}: {e}")
        return None
    
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)
    
    # Normalize
    embedding = outputs[0].cpu().numpy()
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    return embedding


def embed_image_from_bytes(
    image_bytes: bytes,
    processor: AutoProcessor,
    model: AutoModel,
    device: Optional[torch.device] = None
) -> Optional[np.ndarray]:
    """
    Generate normalized image embedding from bytes (for API).
    
    Args:
        image_bytes: Image file bytes
        processor: SigLIP processor
        model: SigLIP model
        device: Torch device (auto-detected if None)
        
    Returns:
        Normalized embedding vector (numpy array) or None if invalid
    """
    if device is None:
        device = get_device()
    
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        print(f"Warning: Could not process image bytes: {e}")
        return None
    
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)
    
    # Normalize
    embedding = outputs[0].cpu().numpy()
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    return embedding


def fuse_embeddings(
    embeddings: List[np.ndarray],
    weights: List[float]
) -> np.ndarray:
    """
    Weighted combination of multiple embeddings with normalization.
    
    Args:
        embeddings: List of embedding vectors
        weights: List of weights (must sum to 1.0)
        
    Returns:
        Normalized fused embedding
    """
    if len(embeddings) != len(weights):
        raise ValueError(f"Number of embeddings ({len(embeddings)}) must match number of weights ({len(weights)})")
    
    # Filter out None embeddings
    valid_embeddings = []
    valid_weights = []
    total_weight = 0.0
    
    for emb, w in zip(embeddings, weights):
        if emb is not None:
            valid_embeddings.append(emb)
            valid_weights.append(w)
            total_weight += w
    
    if not valid_embeddings:
        raise ValueError("No valid embeddings provided")
    
    # Normalize weights
    if total_weight > 0:
        valid_weights = [w / total_weight for w in valid_weights]
    
    # Weighted sum
    fused = np.zeros_like(valid_embeddings[0])
    for emb, w in zip(valid_embeddings, valid_weights):
        fused += w * emb
    
    # Normalize result
    norm = np.linalg.norm(fused)
    if norm > 0:
        fused = fused / norm
    
    return fused


def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """Normalize an embedding vector to unit length."""
    norm = np.linalg.norm(embedding)
    if norm > 0:
        return embedding / norm
    return embedding


def embed_query(
    query_text: Optional[str],
    query_image: Optional[bytes],
    processor: AutoProcessor,
    model: AutoModel,
    device: Optional[torch.device] = None
) -> Optional[np.ndarray]:
    """
    Embed a query (text, image, or both).
    
    Args:
        query_text: Optional text query
        query_image: Optional image bytes
        processor: SigLIP processor
        model: SigLIP model
        device: Torch device
        
    Returns:
        Normalized query embedding or None if no valid input
    """
    if device is None:
        device = get_device()
    
    text_emb = None
    image_emb = None
    
    if query_text:
        text_emb = embed_text(query_text, processor, model, device)
    
    if query_image:
        image_emb = embed_image_from_bytes(query_image, processor, model, device)
    
    if text_emb is not None and image_emb is not None:
        # Both provided: equal weight fusion
        return fuse_embeddings([text_emb, image_emb], [0.5, 0.5])
    elif text_emb is not None:
        return text_emb
    elif image_emb is not None:
        return image_emb
    else:
        return None




