"""
Collaborative filtering for personalized recommendations.
Implements user-user and item-item similarity for cold-start handling.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict
import json
from pathlib import Path


class CollaborativeFiltering:
    """
    Collaborative filtering for user-user and item-item similarity.
    
    Methods:
    - User-user similarity: Find similar users based on interaction patterns
    - Item-item similarity: Find similar items based on user interactions
    - Hybrid recommendations: Combine content-based and collaborative filtering
    """
    
    def __init__(self, user_vectors_path: str = "data/user_vectors.json"):
        """
        Initialize collaborative filtering.
        
        Args:
            user_vectors_path: Path to user vectors JSON file
        """
        self.user_vectors_path = Path(user_vectors_path)
        self.user_interactions = defaultdict(list)  # user_id -> [(item_id, interaction_type, timestamp)]
        self.item_interactions = defaultdict(list)  # item_id -> [(user_id, interaction_type, timestamp)]
        self._load_interactions()
    
    def _load_interactions(self):
        """Load user interactions from storage."""
        if not self.user_vectors_path.exists():
            return
        
        try:
            with open(self.user_vectors_path, 'r') as f:
                user_data = json.load(f)
            
            for user_id, user_info in user_data.items():
                interactions = user_info.get('interactions', [])
                for interaction in interactions:
                    # Extract item_id if available
                    item_id = interaction.get('item_id')
                    interaction_type = interaction.get('type', 'click')
                    timestamp = interaction.get('timestamp', 0)
                    
                    if item_id:
                        self.user_interactions[user_id].append((item_id, interaction_type, timestamp))
                        self.item_interactions[item_id].append((user_id, interaction_type, timestamp))
        except Exception as e:
            print(f"Warning: Could not load interactions for collaborative filtering: {e}")
    
    def compute_user_user_similarity(
        self,
        user_id: str,
        user_vectors: Dict[str, np.ndarray],
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Compute user-user similarity using cosine similarity on user vectors.
        
        Args:
            user_id: Target user ID
            user_vectors: Dictionary mapping user_id to user vector
            top_k: Number of similar users to return
            
        Returns:
            List of (similar_user_id, similarity_score) tuples, sorted by similarity
        """
        if user_id not in user_vectors:
            return []
        
        target_vector = user_vectors[user_id]
        similarities = []
        
        for other_user_id, other_vector in user_vectors.items():
            if other_user_id == user_id:
                continue
            
            # Cosine similarity
            similarity = np.dot(target_vector, other_vector)
            similarities.append((other_user_id, float(similarity)))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def compute_user_user_similarity_by_interactions(
        self,
        user_id: str,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Compute user-user similarity based on interaction overlap (Jaccard similarity).
        
        Args:
            user_id: Target user ID
            top_k: Number of similar users to return
            
        Returns:
            List of (similar_user_id, similarity_score) tuples, sorted by similarity
        """
        if user_id not in self.user_interactions:
            return []
        
        target_items = set(item_id for item_id, _, _ in self.user_interactions[user_id])
        similarities = []
        
        for other_user_id, other_interactions in self.user_interactions.items():
            if other_user_id == user_id:
                continue
            
            other_items = set(item_id for item_id, _, _ in other_interactions)
            
            # Jaccard similarity: intersection / union
            intersection = len(target_items & other_items)
            union = len(target_items | other_items)
            
            if union > 0:
                similarity = intersection / union
                similarities.append((other_user_id, similarity))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def compute_item_item_similarity(
        self,
        item_id: str,
        item_embeddings: Dict[str, np.ndarray],
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Compute item-item similarity using cosine similarity on item embeddings.
        
        Args:
            item_id: Target item ID
            item_embeddings: Dictionary mapping item_id to item embedding
            top_k: Number of similar items to return
            
        Returns:
            List of (similar_item_id, similarity_score) tuples, sorted by similarity
        """
        if item_id not in item_embeddings:
            return []
        
        target_embedding = item_embeddings[item_id]
        similarities = []
        
        for other_item_id, other_embedding in item_embeddings.items():
            if other_item_id == item_id:
                continue
            
            # Cosine similarity
            similarity = np.dot(target_embedding, other_embedding)
            similarities.append((other_item_id, float(similarity)))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def compute_item_item_similarity_by_interactions(
        self,
        item_id: str,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Compute item-item similarity based on user interaction overlap (collaborative).
        
        Args:
            item_id: Target item ID
            top_k: Number of similar items to return
            
        Returns:
            List of (similar_item_id, similarity_score) tuples, sorted by similarity
        """
        if item_id not in self.item_interactions:
            return []
        
        target_users = set(user_id for user_id, _, _ in self.item_interactions[item_id])
        similarities = []
        
        for other_item_id, other_interactions in self.item_interactions.items():
            if other_item_id == item_id:
                continue
            
            other_users = set(user_id for user_id, _, _ in other_interactions)
            
            # Jaccard similarity: intersection / union
            intersection = len(target_users & other_users)
            union = len(target_users | other_users)
            
            if union > 0:
                similarity = intersection / union
                similarities.append((other_item_id, similarity))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
    
    def get_collaborative_recommendations(
        self,
        user_id: str,
        user_vectors: Dict[str, np.ndarray],
        item_embeddings: Dict[str, np.ndarray],
        top_k: int = 10,
        use_item_similarity: bool = True
    ) -> List[Tuple[str, float]]:
        """
        Get collaborative recommendations for a user.
        
        Strategy:
        1. Find similar users
        2. Get items liked by similar users
        3. Score items by similarity-weighted interactions
        
        Args:
            user_id: Target user ID
            user_vectors: Dictionary mapping user_id to user vector
            item_embeddings: Dictionary mapping item_id to item embedding
            top_k: Number of recommendations to return
            use_item_similarity: Whether to use item-item similarity as fallback
            
        Returns:
            List of (item_id, score) tuples, sorted by score
        """
        # Find similar users
        similar_users = self.compute_user_user_similarity(user_id, user_vectors, top_k=20)
        
        if not similar_users and use_item_similarity:
            # Fallback: use item-item similarity based on user's past interactions
            return self._get_item_based_recommendations(user_id, item_embeddings, top_k)
        
        # Collect items from similar users
        item_scores = defaultdict(float)
        
        for similar_user_id, similarity in similar_users:
            if similar_user_id not in self.user_interactions:
                continue
            
            # Get items this similar user interacted with
            for item_id, interaction_type, _ in self.user_interactions[similar_user_id]:
                # Weight by interaction type
                interaction_weights = {
                    'click': 1.0,
                    'like': 2.0,
                    'purchase': 5.0
                }
                interaction_weight = interaction_weights.get(interaction_type, 1.0)
                
                # Score = user similarity * interaction weight
                score = similarity * interaction_weight
                item_scores[item_id] += score
        
        # Sort by score
        recommendations = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        
        return recommendations[:top_k]
    
    def _get_item_based_recommendations(
        self,
        user_id: str,
        item_embeddings: Dict[str, np.ndarray],
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get item-based collaborative recommendations.
        
        For each item the user interacted with, find similar items.
        
        Args:
            user_id: Target user ID
            item_embeddings: Dictionary mapping item_id to item embedding
            top_k: Number of recommendations to return
            
        Returns:
            List of (item_id, score) tuples, sorted by score
        """
        if user_id not in self.user_interactions:
            return []
        
        item_scores = defaultdict(float)
        
        # For each item user interacted with
        for item_id, interaction_type, _ in self.user_interactions[user_id]:
            if item_id not in item_embeddings:
                continue
            
            # Find similar items
            similar_items = self.compute_item_item_similarity(item_id, item_embeddings, top_k=20)
            
            # Weight by interaction type
            interaction_weights = {
                'click': 1.0,
                'like': 2.0,
                'purchase': 5.0
            }
            interaction_weight = interaction_weights.get(interaction_type, 1.0)
            
            # Score similar items
            for similar_item_id, similarity in similar_items:
                score = similarity * interaction_weight
                item_scores[similar_item_id] += score
        
        # Sort by score
        recommendations = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)
        
        return recommendations[:top_k]
    
    def update_interaction(
        self,
        user_id: str,
        item_id: str,
        interaction_type: str = 'click',
        timestamp: Optional[float] = None
    ):
        """
        Update interaction data for collaborative filtering.
        
        Args:
            user_id: User identifier
            item_id: Item identifier
            interaction_type: Type of interaction ('click', 'like', 'purchase')
            timestamp: Unix timestamp (default: current time)
        """
        import time
        if timestamp is None:
            timestamp = time.time()
        
        self.user_interactions[user_id].append((item_id, interaction_type, timestamp))
        self.item_interactions[item_id].append((user_id, interaction_type, timestamp))
    
    def get_cold_start_recommendations(
        self,
        item_embeddings: Dict[str, np.ndarray],
        query_embedding: np.ndarray,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Get recommendations for cold-start users (no interaction history).
        
        Uses content-based similarity between query and items.
        
        Args:
            item_embeddings: Dictionary mapping item_id to item embedding
            query_embedding: Query embedding vector
            top_k: Number of recommendations to return
            
        Returns:
            List of (item_id, similarity_score) tuples, sorted by similarity
        """
        similarities = []
        
        for item_id, item_embedding in item_embeddings.items():
            # Cosine similarity
            similarity = np.dot(query_embedding, item_embedding)
            similarities.append((item_id, float(similarity)))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]

