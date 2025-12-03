"""
User vector management for personalized recommendations.
Handles hybrid user vectors: explicit preferences + interaction history.
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys
import torch
import time
from datetime import datetime, timedelta

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from embedding_utils import embed_text, load_siglip_model, get_device


class UserVectorManager:
    """
    Manages user preference vectors for personalization.
    
    Hybrid approach:
    - Base vector: Embedding of explicit preferences
    - Interaction vector: Average of interaction embeddings
    - Combined: Weighted average (default: 0.6 * base + 0.4 * interactions)
    """
    
    def __init__(
        self,
        storage_path: str = "data/user_vectors.json",
        processor=None,
        model=None,
        device=None,
        base_weight: float = 0.6,
        interaction_weight: float = 0.4,
        temporal_decay_half_life_days: float = 30.0
    ):
        """
        Initialize user vector manager.
        
        Args:
            storage_path: Path to JSON file storing user vectors
            processor: SigLIP processor (will load if None)
            model: SigLIP model (will load if None)
            device: Torch device (will auto-detect if None)
            base_weight: Weight for explicit preferences (default 0.6)
            interaction_weight: Weight for interaction history (default 0.4)
            temporal_decay_half_life_days: Half-life for temporal decay in days (default 30)
        """
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Load or initialize SigLIP model
        if processor is None or model is None:
            self.processor, self.model = load_siglip_model("google/siglip-base-patch16-224")
        else:
            self.processor = processor
            self.model = model
        
        if device is None:
            self.device = get_device()
        else:
            self.device = device
        
        self.base_weight = base_weight
        self.interaction_weight = interaction_weight
        self.temporal_decay_half_life_days = temporal_decay_half_life_days
        
        # Load existing user vectors
        self.user_data = self._load_user_data()
    
    def _load_user_data(self) -> Dict[str, Any]:
        """Load user data from storage file."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Warning: Could not load user vectors: {e}")
                return {}
        return {}
    
    def _save_user_data(self):
        """Save user data to storage file."""
        with open(self.storage_path, 'w') as f:
            json.dump(self.user_data, f, indent=2)
    
    def _ensure_user(self, user_id: str):
        """Ensure user exists in data structure."""
        if user_id not in self.user_data:
            self.user_data[user_id] = {
                'preferences': None,
                'preferences_text': None,
                'interactions': [],
                'interaction_embeddings': [],
                'interaction_timestamps': []
            }
    
    def update_from_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ):
        """
        Update user vector from explicit preferences.
        
        Args:
            user_id: User identifier
            preferences: Dictionary with preferences like:
                {
                    'metal': 'rose gold',
                    'style': 'vintage',
                    'price_range': [1000, 5000],
                    'diamond_color': 'D-F',
                    'diamond_shape': 'round'
                }
        """
        self._ensure_user(user_id)
        
        # Convert preferences to text
        pref_parts = []
        if preferences.get('metal'):
            pref_parts.append(f"prefers {preferences['metal']}")
        if preferences.get('style'):
            pref_parts.append(f"prefers {preferences['style']} style")
        if preferences.get('price_range'):
            min_price, max_price = preferences['price_range']
            pref_parts.append(f"price range ${min_price} to ${max_price}")
        if preferences.get('diamond_color'):
            pref_parts.append(f"prefers {preferences['diamond_color']} color diamonds")
        if preferences.get('diamond_shape'):
            pref_parts.append(f"prefers {preferences['diamond_shape']} shape")
        
        preferences_text = ". ".join(pref_parts) if pref_parts else "no specific preferences"
        
        # Embed preferences
        try:
            pref_embedding = embed_text(
                preferences_text,
                self.processor,
                self.model,
                self.device
            )
            
            if pref_embedding is not None:
                # Normalize embedding
                norm = np.linalg.norm(pref_embedding)
                if norm > 0:
                    pref_embedding = pref_embedding / norm
                
                self.user_data[user_id]['preferences'] = pref_embedding.tolist()
                self.user_data[user_id]['preferences_text'] = preferences_text
                self._save_user_data()
        except Exception as e:
            print(f"Error embedding preferences for user {user_id}: {e}")
    
    def _compute_temporal_decay_weight(self, timestamp: float, current_time: float) -> float:
        """
        Compute temporal decay weight for an interaction.
        
        Uses exponential decay: weight = 2^(-days_since / half_life_days)
        
        Args:
            timestamp: Interaction timestamp (Unix time)
            current_time: Current timestamp (Unix time)
            
        Returns:
            Decay weight (0-1)
        """
        days_since = (current_time - timestamp) / (24 * 3600)  # Convert to days
        if days_since <= 0:
            return 1.0
        
        # Exponential decay: weight = 2^(-days_since / half_life)
        decay_weight = 2.0 ** (-days_since / self.temporal_decay_half_life_days)
        return max(0.0, min(1.0, decay_weight))  # Clamp to [0, 1]
    
    def update_from_interactions(
        self,
        user_id: str,
        interactions: List[Dict[str, Any]]
    ):
        """
        Update user vector from interaction history with temporal decay.
        
        Args:
            user_id: User identifier
            interactions: List of interaction dictionaries with:
                {
                    'type': 'click' | 'like' | 'purchase',
                    'item_embedding': np.ndarray or list,  # Embedding of interacted item
                    'weight': float,  # Optional weight (default 1.0)
                    'timestamp': float  # Optional Unix timestamp (default: current time)
                }
        """
        self._ensure_user(user_id)
        current_time = time.time()
        
        # Process interactions
        interaction_embeddings = []
        interaction_timestamps = []
        
        for interaction in interactions:
            item_embedding = interaction.get('item_embedding')
            base_weight = interaction.get('weight', 1.0)
            timestamp = interaction.get('timestamp', current_time)
            
            if item_embedding is not None:
                # Convert to numpy array if needed
                if isinstance(item_embedding, list):
                    item_embedding = np.array(item_embedding)
                
                # Normalize
                norm = np.linalg.norm(item_embedding)
                if norm > 0:
                    item_embedding = item_embedding / norm
                
                # Apply temporal decay
                temporal_weight = self._compute_temporal_decay_weight(timestamp, current_time)
                final_weight = base_weight * temporal_weight
                
                # Apply combined weight
                item_embedding = item_embedding * final_weight
                interaction_embeddings.append(item_embedding.tolist())
                interaction_timestamps.append(timestamp)
        
        # Store interactions
        self.user_data[user_id]['interactions'].extend(interactions)
        self.user_data[user_id]['interaction_embeddings'].extend(interaction_embeddings)
        self.user_data[user_id]['interaction_timestamps'].extend(interaction_timestamps)
        
        # Keep only last N interactions (to avoid memory issues)
        max_interactions = 100
        if len(self.user_data[user_id]['interaction_embeddings']) > max_interactions:
            self.user_data[user_id]['interactions'] = self.user_data[user_id]['interactions'][-max_interactions:]
            self.user_data[user_id]['interaction_embeddings'] = self.user_data[user_id]['interaction_embeddings'][-max_interactions:]
            self.user_data[user_id]['interaction_timestamps'] = self.user_data[user_id]['interaction_timestamps'][-max_interactions:]
        
        self._save_user_data()
    
    def get_combined_vector(self, user_id: str) -> Optional[np.ndarray]:
        """
        Get combined user vector (preferences + interactions).
        
        Args:
            user_id: User identifier
            
        Returns:
            Combined user vector (normalized) or None if user doesn't exist
        """
        if user_id not in self.user_data:
            return None
        
        user_info = self.user_data[user_id]
        
        # Get base preferences vector
        base_vector = None
        if user_info.get('preferences'):
            base_vector = np.array(user_info['preferences'])
        
        # Get interaction vector (weighted average with temporal decay)
        interaction_vector = None
        if user_info.get('interaction_embeddings'):
            embeddings = np.array(user_info['interaction_embeddings'])
            timestamps = user_info.get('interaction_timestamps', [])
            current_time = time.time()
            
            # Apply temporal decay if timestamps available
            if timestamps and len(timestamps) == len(embeddings):
                # Recompute weights with current time
                weights = []
                for ts in timestamps:
                    decay_weight = self._compute_temporal_decay_weight(ts, current_time)
                    weights.append(decay_weight)
                weights = np.array(weights)
                weights = weights / np.sum(weights) if np.sum(weights) > 0 else weights
                
                # Weighted average
                interaction_vector = np.average(embeddings, axis=0, weights=weights)
            else:
                # Simple average if no timestamps
                interaction_vector = np.mean(embeddings, axis=0)
            
            # Normalize interaction vector
            norm = np.linalg.norm(interaction_vector)
            if norm > 0:
                interaction_vector = interaction_vector / norm
        
        # Combine vectors
        if base_vector is not None and interaction_vector is not None:
            # Weighted combination
            combined = (
                self.base_weight * base_vector +
                self.interaction_weight * interaction_vector
            )
        elif base_vector is not None:
            combined = base_vector
        elif interaction_vector is not None:
            combined = interaction_vector
        else:
            # No user data, return None
            return None
        
        # Normalize final vector
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        
        return combined
    
    def get_user_vector(self, user_id: str) -> Optional[np.ndarray]:
        """
        Get user vector (alias for get_combined_vector).
        
        Args:
            user_id: User identifier
            
        Returns:
            User vector or None
        """
        return self.get_combined_vector(user_id)
    
    def log_interaction(
        self,
        user_id: str,
        item_embedding: np.ndarray,
        interaction_type: str = 'click',
        weight: Optional[float] = None,
        timestamp: Optional[float] = None
    ):
        """
        Convenience method to log a single interaction with temporal decay.
        
        Args:
            user_id: User identifier
            item_embedding: Embedding of the item user interacted with
            interaction_type: Type of interaction ('click', 'like', 'purchase')
            weight: Weight for this interaction (default based on type: purchase=5.0, like=2.0, click=1.0)
            timestamp: Unix timestamp (default: current time)
        """
        if weight is None:
            weights = {
                'click': 1.0,
                'like': 2.0,
                'purchase': 5.0
            }
            weight = weights.get(interaction_type, 1.0)
        
        if timestamp is None:
            timestamp = time.time()
        
        interaction = {
            'type': interaction_type,
            'item_embedding': item_embedding.tolist() if isinstance(item_embedding, np.ndarray) else item_embedding,
            'weight': weight,
            'timestamp': timestamp
        }
        self.update_from_interactions(user_id, [interaction])
    
    def initialize_from_similar_users(
        self,
        user_id: str,
        similar_user_ids: List[str],
        similarity_scores: List[float]
    ) -> Optional[np.ndarray]:
        """
        Initialize user vector from similar users (collaborative filtering).
        
        Uses weighted average of similar users' vectors.
        
        Args:
            user_id: User identifier
            similar_user_ids: List of similar user IDs
            similarity_scores: List of similarity scores (should match user_ids)
            
        Returns:
            Initialized user vector or None if no similar users found
        """
        if not similar_user_ids or not similarity_scores:
            return None
        
        # Get vectors from similar users
        user_vectors = []
        weights = []
        
        for sim_user_id, sim_score in zip(similar_user_ids, similarity_scores):
            sim_vector = self.get_user_vector(sim_user_id)
            if sim_vector is not None:
                user_vectors.append(sim_vector)
                weights.append(sim_score)
        
        if not user_vectors:
            return None
        
        # Weighted average
        weights = np.array(weights)
        weights = weights / np.sum(weights) if np.sum(weights) > 0 else weights
        
        initialized_vector = np.average(user_vectors, axis=0, weights=weights)
        
        # Normalize
        norm = np.linalg.norm(initialized_vector)
        if norm > 0:
            initialized_vector = initialized_vector / norm
        
        # Store as preferences (can be updated later)
        self._ensure_user(user_id)
        self.user_data[user_id]['preferences'] = initialized_vector.tolist()
        self.user_data[user_id]['preferences_text'] = f"Initialized from {len(user_vectors)} similar users"
        self._save_user_data()
        
        return initialized_vector
