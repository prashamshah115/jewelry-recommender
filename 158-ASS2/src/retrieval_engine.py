"""
FAISS-based retrieval engine for jewelry search.
Supports both Cartier and Diamonds datasets with filtering.
"""

import numpy as np
import faiss
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from filters import filter_cartier_by_attributes, filter_diamonds_by_attributes, filter_settings_by_attributes

# Fix OpenMP crash on macOS ARM: Force single-threaded mode
# This prevents FAISS from spawning OpenMP threads that crash on macOS
faiss.omp_set_num_threads(1)


class JewelryRetrievalEngine:
    """Retrieval engine for jewelry items using FAISS."""
    
    def __init__(
        self,
        embeddings_path: str,
        metadata_path: str,
        dataset_type: str = "cartier",  # "cartier" or "diamonds"
        index_type: str = "flat"
    ):
        """
        Initialize retrieval engine.
        
        Args:
            embeddings_path: Path to .npy file with embeddings
            metadata_path: Path to .json file with metadata
            dataset_type: Type of dataset ("cartier" or "diamonds")
            index_type: FAISS index type ("flat" or "ivf")
        """
        self.dataset_type = dataset_type
        self.index_type = index_type
        
        # Load embeddings
        print(f"Loading embeddings from {embeddings_path}")
        self.embeddings = np.load(embeddings_path).astype('float32')
        print(f"Loaded {self.embeddings.shape[0]} embeddings of dimension {self.embeddings.shape[1]}")
        
        # Load metadata
        print(f"Loading metadata from {metadata_path}")
        with open(metadata_path, 'r') as f:
            metadata_dict = json.load(f)
            self.metadata = metadata_dict['data']
        print(f"Loaded {len(self.metadata)} metadata items")
        
        # Build FAISS index
        self.index = self._build_index()
        if self.index_type == "ivf":
            print(f"Trained and built {index_type} FAISS index")
        else:
            print(f"Built {index_type} FAISS index")
    
    def _build_index(self) -> faiss.Index:
        """Build FAISS index from embeddings."""
        d = self.embeddings.shape[1]  # Embedding dimension
        n = self.embeddings.shape[0]  # Number of items
        
        if self.index_type == "flat":
            # Exact search using inner product (for normalized vectors)
            index = faiss.IndexFlatIP(d)
        elif self.index_type == "ivf":
            # Approximate search with IVF (faster for large datasets)
            # NOTE: IVF requires clustering training which crashes on macOS ARM
            # Use "hnsw" index type instead for macOS development
            nlist = min(100, n // 10)  # Number of clusters
            quantizer = faiss.IndexFlatIP(d)
            index = faiss.IndexIVFFlat(quantizer, d, nlist)
            index.nprobe = 10  # Number of clusters to search
            
            # Train IVF index before adding embeddings
            print("Training IVF index...")
            index.train(self.embeddings)
        elif self.index_type == "hnsw":
            # HNSW (Hierarchical Navigable Small World) - No training needed!
            # M=32: number of connections per node (good balance of speed/accuracy)
            # ef_construction=200: controls index construction quality
            index = faiss.IndexHNSWFlat(d, 32)
            index.hnsw.efConstruction = 200
            # No training required - can add embeddings directly
        else:
            raise ValueError(f"Unknown index type: {self.index_type}. Use 'flat', 'ivf', or 'hnsw'")
        
        # Add embeddings to index
        index.add(self.embeddings)
        
        return index
    
    def search(
        self,
        query_vec: np.ndarray,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar items.
        
        Args:
            query_vec: Query embedding vector (normalized)
            top_k: Number of results to return
            filters: Optional filter dictionary
            
        Returns:
            List of result dictionaries with 'id', 'score', 'metadata'
        """
        # Apply filters first if provided
        candidate_indices = None
        if filters:
            if self.dataset_type == "cartier":
                candidate_indices = filter_cartier_by_attributes(self.metadata, filters)
            elif self.dataset_type == "diamonds":
                candidate_indices = filter_diamonds_by_attributes(self.metadata, filters)
            elif self.dataset_type == "settings":
                candidate_indices = filter_settings_by_attributes(self.metadata, filters)
            else:
                raise ValueError(f"Unknown dataset type: {self.dataset_type}")
        
        # If filters applied, search only in candidate subset
        if candidate_indices is not None:
            if len(candidate_indices) == 0:
                return []
            
            # Create subset of embeddings
            candidate_embeddings = self.embeddings[candidate_indices]
            
            # Build temporary index for candidates
            d = candidate_embeddings.shape[1]
            temp_index = faiss.IndexFlatIP(d)
            temp_index.add(candidate_embeddings)
            
            # Search
            query_vec = query_vec.reshape(1, -1).astype('float32')
            k = min(top_k, len(candidate_indices))
            scores, indices = temp_index.search(query_vec, k)
            
            # Map back to original indices
            original_indices = [candidate_indices[i] for i in indices[0]]
            scores = scores[0]
        else:
            # Search all items
            query_vec = query_vec.reshape(1, -1).astype('float32')
            k = min(top_k, self.embeddings.shape[0])
            scores, indices = self.index.search(query_vec, k)
            original_indices = indices[0].tolist()
            scores = scores[0]
        
        # Format results
        results = []
        for idx, score in zip(original_indices, scores):
            if idx < len(self.metadata):
                result = {
                    'id': self.metadata[idx].get('id', str(idx)),
                    'score': float(score),
                    'metadata': self.metadata[idx]
                }
                results.append(result)
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the loaded dataset."""
        return {
            'dataset_type': self.dataset_type,
            'num_items': len(self.metadata),
            'embedding_dim': self.embeddings.shape[1],
            'index_type': self.index_type,
            'index_size': self.index.ntotal if hasattr(self.index, 'ntotal') else len(self.metadata)
        }


def load_retrieval_engine(
    dataset_type: str,
    embeddings_dir: str = "embeddings"
) -> JewelryRetrievalEngine:
    """
    Convenience function to load a retrieval engine.
    
    Args:
        dataset_type: "cartier" or "diamonds"
        embeddings_dir: Directory containing embeddings and metadata
        
    Returns:
        Initialized JewelryRetrievalEngine
    """
    if dataset_type == "cartier":
        embeddings_path = f"{embeddings_dir}/cartier_embeddings.npy"
        metadata_path = f"{embeddings_dir}/cartier_metadata.json"
    elif dataset_type == "diamonds":
        embeddings_path = f"{embeddings_dir}/diamond_embeddings.npy"
        metadata_path = f"{embeddings_dir}/diamond_metadata.json"
    elif dataset_type == "settings":
        embeddings_path = f"{embeddings_dir}/setting_embeddings.npy"
        metadata_path = f"{embeddings_dir}/setting_metadata.json"
    else:
        raise ValueError(f"Unknown dataset type: {dataset_type}")
    
    # Determine index type based on dataset size
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
        num_items = len(metadata['data'])
    
    # Auto-select index type based on dataset size
    # Small datasets (< 10k): flat (exact, fast, no training)
    # Large datasets (> 10k): hnsw (approximate, no training, stable on macOS)
    # NOTE: IVF requires training which crashes on macOS ARM, so we use HNSW instead
    if num_items > 10000:
        index_type = "hnsw"  # Use HNSW instead of IVF for macOS compatibility
    else:
        index_type = "flat"  # Flat is fastest for small datasets
    
    return JewelryRetrievalEngine(
        embeddings_path=embeddings_path,
        metadata_path=metadata_path,
        dataset_type=dataset_type,
        index_type=index_type
    )

