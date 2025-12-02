"""
Personalized recommendation system for diamond + setting combinations.
Uses cosine similarity for query matching and weighted compatibility scoring.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from retrieval_engine import JewelryRetrievalEngine
from user_vector_manager import UserVectorManager
from collaborative_filtering import CollaborativeFiltering


class PersonalizedRecommender:
    """
    Recommends diamond + setting combinations based on:
    - Query similarity (multimodal embedding)
    - Diamond-setting compatibility
    - User preferences (if available)
    """
    
    def __init__(
        self,
        diamond_engine: JewelryRetrievalEngine,
        setting_engine: JewelryRetrievalEngine,
        user_vector_manager: Optional[UserVectorManager] = None,
        collaborative_filtering: Optional[CollaborativeFiltering] = None,
        weights: Optional[Dict[str, float]] = None,
        use_sequential: bool = True,
        diversity_weight: float = 0.1
    ):
        """
        Initialize personalized recommender.
        
        Args:
            diamond_engine: Retrieval engine for diamonds
            setting_engine: Retrieval engine for settings
            user_vector_manager: Manager for user preference vectors
            collaborative_filtering: Collaborative filtering instance (optional)
            weights: Scoring weights dict with keys:
                'query_diamond': weight for query-diamond similarity (default 0.3)
                'query_setting': weight for query-setting similarity (default 0.3)
                'compatibility': weight for diamond-setting compatibility (default 0.2)
                'user_preference': weight for user preference alignment (default 0.2)
            use_sequential: Whether to use sequential recommendation features
            diversity_weight: Weight for diversity penalty (default 0.1)
        """
        self.diamond_engine = diamond_engine
        self.setting_engine = setting_engine
        self.user_vector_manager = user_vector_manager
        self.collaborative_filtering = collaborative_filtering
        self.use_sequential = use_sequential
        self.diversity_weight = diversity_weight
        
        # Default weights
        default_weights = {
            'query_diamond': 0.3,
            'query_setting': 0.3,
            'compatibility': 0.2,
            'user_preference': 0.2
        }
        
        if weights:
            default_weights.update(weights)
        
        self.weights = default_weights
    
    def _extract_key_attributes(
        self,
        query_text: Optional[str] = None,
        top_diamonds: Optional[List[Dict[str, Any]]] = None,
        top_settings: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Extract key attributes (metal, color, shape) from query text or infer from top results.
        
        Priority order:
        1. Extract from query_text if provided
        2. Infer from top results if available
        
        Args:
            query_text: Optional query text string
            top_diamonds: Optional list of top diamond results for inference
            top_settings: Optional list of top setting results for inference
            
        Returns:
            Dict with keys: 'metal', 'color', 'shape' (values are lists or None),
            and 'explicit_attributes' (set of attribute names explicitly mentioned in query)
        """
        attributes = {
            'metal': None,
            'color': None,
            'shape': None
        }
        explicit_attributes = set()  # Track which attributes were explicitly mentioned
        
        # Metal keywords
        metal_keywords = {
            'platinum': ['platinum', 'pt'],
            'white gold': ['white gold', 'whitegold', '18k white', '18k white gold'],
            'yellow gold': ['yellow gold', 'yellowgold', '18k yellow', '18k yellow gold', 'gold'],
            'rose gold': ['rose gold', 'rosegold', 'pink gold', 'pinkgold', '18k rose', '18k pink']
        }
        
        # Color grades
        color_grades = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
        
        # Diamond shapes
        shape_keywords = {
            'round': ['round', 'circle', 'circular'],
            'princess': ['princess', 'square'],
            'cushion': ['cushion', 'pillow'],
            'oval': ['oval', 'elliptical'],
            'emerald': ['emerald', 'rectangular'],
            'pear': ['pear', 'teardrop'],
            'marquise': ['marquise', 'navette'],
            'asscher': ['asscher', 'square step'],
            'radiant': ['radiant'],
            'heart': ['heart']
        }
        
        # Extract from query text
        if query_text:
            query_lower = query_text.lower()
            
            # Extract metal
            for metal, keywords in metal_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    attributes['metal'] = [metal]
                    explicit_attributes.add('metal')
                    break
            
            # Extract color
            for color in color_grades:
                if f' {color} ' in f' {query_text.upper()} ' or f' {color.lower()} ' in query_lower:
                    attributes['color'] = [color]
                    explicit_attributes.add('color')
                    break
            
            # Extract shape
            for shape, keywords in shape_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    attributes['shape'] = [shape.capitalize()]
                    explicit_attributes.add('shape')
                    break
        
        # Infer from top results if not found in text
        if not attributes['metal'] and top_settings:
            # Get most common metal from top settings
            metals = []
            for setting in top_settings[:5]:  # Check top 5
                metal = setting.get('metadata', {}).get('metal', '')
                if metal:
                    metals.append(metal.lower())
            if metals:
                # Get most common
                from collections import Counter
                most_common = Counter(metals).most_common(1)
                if most_common:
                    attributes['metal'] = [most_common[0][0]]
        
        if not attributes['color'] and top_diamonds:
            # Get most common color from top diamonds
            colors = []
            for diamond in top_diamonds[:5]:  # Check top 5
                color = diamond.get('metadata', {}).get('color', '')
                if color:
                    colors.append(color.upper())
            if colors:
                from collections import Counter
                most_common = Counter(colors).most_common(1)
                if most_common:
                    attributes['color'] = [most_common[0][0]]
        
        if not attributes['shape'] and top_diamonds:
            # Get most common shape from top diamonds
            shapes = []
            for diamond in top_diamonds[:5]:  # Check top 5
                shape = diamond.get('metadata', {}).get('shape', '')
                if shape:
                    shapes.append(shape.lower())
            if shapes:
                from collections import Counter
                most_common = Counter(shapes).most_common(1)
                if most_common:
                    attributes['shape'] = [most_common[0][0].capitalize()]
        
        # Add explicit_attributes flag to return dict
        attributes['explicit_attributes'] = explicit_attributes
        
        return attributes
    
    def _compute_cosine_similarity(
        self,
        query_vec: np.ndarray,
        item_matrix: np.ndarray,
        top_k: int = 5
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute cosine similarity between query vector and item matrix.
        
        Based on provided cosine similarity code.
        
        Args:
            query_vec: Query embedding vector (1D, normalized)
            item_matrix: Matrix of item embeddings (N x D)
            top_k: Number of top results to return
            
        Returns:
            Tuple of (top_indices, top_scores)
        """
        # Normalize query vector
        query_norm = np.linalg.norm(query_vec)
        if query_norm == 0:
            query_norm = 1e-10
        query_normalized = query_vec / query_norm
        
        # Normalize item matrix
        item_norms = np.linalg.norm(item_matrix, axis=1)
        item_norms[item_norms == 0] = 1e-10
        item_matrix_normalized = item_matrix / item_norms[:, np.newaxis]
        
        # Dot product (cosine similarity)
        similarity_scores = np.dot(item_matrix_normalized, query_normalized.T).flatten()
        
        # Get top-k
        top_indices = np.argsort(similarity_scores)[::-1][:top_k]
        top_scores = similarity_scores[top_indices]
        
        return top_indices, top_scores
    
    def _compute_diamond_setting_compatibility(
        self,
        diamond: Dict[str, Any],
        setting: Dict[str, Any]
    ) -> float:
        """
        Compute compatibility score between diamond and setting.
        
        Rule-based matching:
        - Metal-color matching (e.g., D/E/F diamonds with platinum/white gold)
        - Style matching (vintage with vintage, modern with modern)
        - Price compatibility
        
        Args:
            diamond: Diamond metadata dict
            setting: Setting metadata dict
            
        Returns:
            Compatibility score (0-1)
        """
        diamond_meta = diamond.get('metadata', {})
        setting_meta = setting.get('metadata', {})
        
        compatibility_score = 0.0
        factors = []
        
        # 1. Metal-color matching
        diamond_color = str(diamond_meta.get('color', '')).upper()
        setting_metal = str(setting_meta.get('metal', '')).lower()
        
        # Premium diamonds (D, E, F) go well with platinum/white gold
        if diamond_color in ['D', 'E', 'F']:
            if 'platinum' in setting_metal or 'white gold' in setting_metal:
                compatibility_score += 0.3
                factors.append('premium_color_metal_match')
        # Mid-range diamonds (G, H, I) work with all metals
        elif diamond_color in ['G', 'H', 'I']:
            compatibility_score += 0.2
            factors.append('mid_color_flexible')
        # Lower colors work well with yellow/rose gold
        elif diamond_color in ['J', 'K', 'L']:
            if 'yellow gold' in setting_metal or 'pink gold' in setting_metal or 'rose gold' in setting_metal:
                compatibility_score += 0.25
                factors.append('warm_color_metal_match')
        
        # 2. Style matching
        diamond_cut = str(diamond_meta.get('cut', '')).lower()
        setting_style = str(setting_meta.get('style', '')).lower()
        
        # Round brilliant works with most styles
        if 'round' in diamond_cut or 'brilliant' in diamond_cut:
            compatibility_score += 0.2
            factors.append('round_flexible')
        # Fancy shapes work with specific styles
        elif any(shape in diamond_cut for shape in ['princess', 'cushion', 'emerald']):
            if 'vintage' in setting_style or 'classic' in setting_style:
                compatibility_score += 0.25
                factors.append('fancy_vintage_match')
        
        # 3. Price compatibility
        diamond_price = diamond_meta.get('price', 0) or 0
        setting_price = setting_meta.get('price', 0) or 0
        
        if diamond_price > 0 and setting_price > 0:
            # Setting should be 20-40% of total (diamond + setting)
            total_price = diamond_price + setting_price
            setting_ratio = setting_price / total_price if total_price > 0 else 0
            
            if 0.2 <= setting_ratio <= 0.4:
                compatibility_score += 0.2
                factors.append('price_ratio_good')
            elif 0.15 <= setting_ratio <= 0.5:
                compatibility_score += 0.1
                factors.append('price_ratio_acceptable')
        
        # 4. Carat-size matching (larger diamonds need sturdier settings)
        carat = diamond_meta.get('carat_weight', 0) or 0
        if carat > 2.0:
            # Large diamonds need substantial settings
            if setting_meta.get('band_width_mm', 0) and setting_meta['band_width_mm'] >= 2.0:
                compatibility_score += 0.1
                factors.append('large_diamond_sturdy_setting')
        elif carat < 0.5:
            # Small diamonds work with delicate settings
            if not setting_meta.get('band_width_mm') or setting_meta['band_width_mm'] <= 3.0:
                compatibility_score += 0.1
                factors.append('small_diamond_delicate_setting')
        
        # Normalize to 0-1 range
        return min(1.0, compatibility_score)
    
    def _boost_attribute_matches(
        self,
        diamond: Dict[str, Any],
        setting: Dict[str, Any],
        key_attributes: Dict[str, Any]
    ) -> float:
        """
        Boost score for exact matches on key attributes (metal, color, shape).
        
        Args:
            diamond: Diamond result dict with metadata
            setting: Setting result dict with metadata
            key_attributes: Dict with 'metal', 'color', 'shape' (lists or None)
            
        Returns:
            Boost score (0-1) based on attribute matches
        """
        boost = 0.0
        diamond_meta = diamond.get('metadata', {})
        setting_meta = setting.get('metadata', {})
        
        # Metal match (from setting)
        if key_attributes.get('metal'):
            setting_metal = str(setting_meta.get('metal', '')).lower()
            for preferred_metal in key_attributes['metal']:
                if preferred_metal.lower() in setting_metal or setting_metal in preferred_metal.lower():
                    boost += 0.4  # High boost for metal match
                    break
        
        # Color match (from diamond)
        if key_attributes.get('color'):
            diamond_color = str(diamond_meta.get('color', '')).upper()
            for preferred_color in key_attributes['color']:
                if preferred_color.upper() == diamond_color:
                    boost += 0.3  # High boost for color match
                    break
        
        # Shape match (from diamond)
        if key_attributes.get('shape'):
            diamond_shape = str(diamond_meta.get('shape', '')).lower()
            for preferred_shape in key_attributes['shape']:
                if preferred_shape.lower() in diamond_shape or diamond_shape in preferred_shape.lower():
                    boost += 0.3  # High boost for shape match
                    break
        
        return min(1.0, boost)  # Cap at 1.0
    
    def _score_combination(
        self,
        query_vec: np.ndarray,
        diamond: Dict[str, Any],
        setting: Dict[str, Any],
        user_vector: Optional[np.ndarray] = None,
        key_attributes: Optional[Dict[str, Any]] = None,
        has_image_query: bool = False
    ) -> float:
        """
        Score a diamond-setting combination using hierarchical weighted formula.
        
        Hierarchical priority:
        1. Image similarity (0.5 when image provided, 0.3 otherwise)
        2. Attribute matching (metal, color, shape) - 0.3
        3. Design/style compatibility - 0.1
        4. User preference alignment - 0.1
        
        Args:
            query_vec: Query embedding vector
            diamond: Diamond result dict with 'score' and 'metadata'
            setting: Setting result dict with 'score' and 'metadata'
            user_vector: Optional user preference vector
            key_attributes: Optional dict with extracted key attributes
            has_image_query: Whether query includes an image
            
        Returns:
            Final combination score
        """
        # 1. Image/query similarity (diamond + setting)
        query_sim_diamond = diamond.get('score', 0.0)
        query_sim_setting = setting.get('score', 0.0)
        # Average similarity represents overall query match
        image_similarity = (query_sim_diamond + query_sim_setting) / 2.0
        
        # 2. Attribute matching boost
        attribute_boost = 0.0
        if key_attributes:
            attribute_boost = self._boost_attribute_matches(diamond, setting, key_attributes)
        
        # 3. Diamond-setting compatibility
        compatibility = self._compute_diamond_setting_compatibility(diamond, setting)
        
        # 4. User preference alignment
        user_alignment = 0.0
        if user_vector is not None:
            diamond_idx = diamond.get('metadata', {}).get('id')
            setting_idx = setting.get('metadata', {}).get('id')
            
            if diamond_idx is not None and setting_idx is not None:
                try:
                    diamond_emb = self.diamond_engine.embeddings[int(diamond_idx)]
                    setting_emb = self.setting_engine.embeddings[int(setting_idx)]
                    combined_emb = (diamond_emb + setting_emb) / 2.0
                    norm = np.linalg.norm(combined_emb)
                    if norm > 0:
                        combined_emb = combined_emb / norm
                    user_alignment = np.dot(user_vector, combined_emb)
                except (IndexError, KeyError, ValueError):
                    user_alignment = (query_sim_diamond + query_sim_setting) / 2.0
        
        # Hierarchical weights based on query type
        if has_image_query:
            # Image query: prioritize image similarity heavily
            image_weight = 0.5
            attribute_weight = 0.3
            compatibility_weight = 0.1
            user_weight = 0.1
        else:
            # Text query: balance image similarity and attributes
            image_weight = 0.3
            attribute_weight = 0.4
            compatibility_weight = 0.2
            user_weight = 0.1
        
        # Weighted combination with attribute boost
        final_score = (
            image_weight * image_similarity +
            attribute_weight * attribute_boost +
            compatibility_weight * compatibility +
            user_weight * user_alignment
        )
        
        return final_score
    
    def _quick_compatibility_check(
        self,
        diamond: Dict[str, Any],
        setting: Dict[str, Any]
    ) -> bool:
        """
        Quick rule-based compatibility check (fast, no embedding math).
        Used for pre-filtering before expensive scoring.
        
        Returns:
            True if combination is likely compatible, False otherwise
        """
        diamond_meta = diamond.get('metadata', {})
        setting_meta = setting.get('metadata', {})
        
        # Quick checks (fast string/num comparisons)
        
        # 1. Metal-color matching (premium diamonds with premium metals)
        diamond_color = str(diamond_meta.get('color', '')).upper()
        setting_metal = str(setting_meta.get('metal', '')).lower()
        
        if diamond_color in ['D', 'E', 'F']:
            # Premium colors work best with platinum/white gold
            if 'platinum' not in setting_metal and 'white gold' not in setting_metal:
                # Not ideal, but don't filter out completely
                pass
        
        # 2. Price compatibility (setting should be 15-50% of total)
        diamond_price = diamond_meta.get('price', 0) or 0
        setting_price = setting_meta.get('price', 0) or 0
        
        if diamond_price > 0 and setting_price > 0:
            total_price = diamond_price + setting_price
            setting_ratio = setting_price / total_price if total_price > 0 else 0
            
            # Filter out extreme mismatches
            if setting_ratio < 0.1 or setting_ratio > 0.6:
                return False  # Too extreme
        
        # 3. Carat-size matching (large diamonds need substantial settings)
        carat = diamond_meta.get('carat_weight', 0) or 0
        if carat > 3.0:
            # Very large diamonds need substantial settings
            band_width = setting_meta.get('band_width_mm', 0) or 0
            if band_width > 0 and band_width < 1.5:
                return False  # Too delicate for large diamond
        
        # All checks passed
        return True
    
    def recommend_combinations(
        self,
        query_vec: np.ndarray,
        top_k: int = 10,
        user_id: Optional[str] = None,
        diamond_filters: Optional[Dict[str, Any]] = None,
        setting_filters: Optional[Dict[str, Any]] = None,
        max_candidates: int = 15,  # Reduced from 30 for performance
        query_text: Optional[str] = None,
        has_image_query: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Recommend diamond + setting combinations with hierarchical prioritization.
        
        Uses multi-stage approach:
        1. Get top candidates
        2. Extract key attributes (metal, color, shape) from query or infer from results
        3. Filter by key attributes first (if available)
        4. Pre-filter incompatible combinations (fast rules)
        5. Score with hierarchical weights (image similarity > attributes > design)
        
        Args:
            query_vec: Query embedding vector (normalized)
            top_k: Number of combinations to return
            user_id: Optional user ID for personalization
            diamond_filters: Optional filters for diamonds
            setting_filters: Optional filters for settings
            max_candidates: Maximum candidates per type (default 15, was 30)
            query_text: Optional query text for attribute extraction
            has_image_query: Whether query includes an image (affects weight distribution)
            
        Returns:
            List of combination dicts with:
                - 'diamond': diamond metadata
                - 'setting': setting metadata
                - 'combination_score': final score
                - 'total_price': diamond price + setting price
                - 'score_breakdown': dict with individual scores
        """
        # Get user vector if available
        user_vector = None
        use_collaborative_fallback = False
        
        if user_id and self.user_vector_manager:
            user_vector = self.user_vector_manager.get_user_vector(user_id)
            
            # Check if user vector is sparse (cold-start)
            if user_vector is None and self.collaborative_filtering:
                use_collaborative_fallback = True
            elif user_vector is not None:
                # Check if user has few interactions (sparse vector)
                user_data = self.user_vector_manager.user_data.get(user_id, {})
                interactions = user_data.get('interactions', [])
                if len(interactions) < 3 and self.collaborative_filtering:
                    use_collaborative_fallback = True
        
        # Step 1: Extract key attributes from query FIRST (before getting candidates)
        # This allows us to apply explicit filters at the FAISS level
        key_attributes = self._extract_key_attributes(
            query_text=query_text,
            top_diamonds=None,  # Don't infer yet, use explicit query first
            top_settings=None
        )
        
        # Get explicit attributes set (remove it from key_attributes for filtering logic)
        explicit_attributes = key_attributes.pop('explicit_attributes', set())
        
        # Step 2: If shape is explicitly mentioned, add it to diamond_filters
        # This makes shape mandatory when user explicitly requests it
        if 'shape' in explicit_attributes and key_attributes.get('shape'):
            # Add shape filter to diamond_filters to filter at FAISS level
            if diamond_filters is None:
                diamond_filters = {}
            diamond_filters['shape'] = key_attributes['shape']
        
        # Step 3: Get candidate diamonds (with shape filter if explicit)
        candidate_diamonds = self.diamond_engine.search(
            query_vec,
            top_k=max_candidates,
            filters=diamond_filters
        )
        
        # Step 4: Get candidate settings
        candidate_settings = self.setting_engine.search(
            query_vec,
            top_k=max_candidates,
            filters=setting_filters
        )
        
        if not candidate_diamonds or not candidate_settings:
            return []
        
        # Step 5: Re-extract attributes with top results for inference (if needed)
        # This allows us to infer attributes we didn't explicitly extract
        if not any(key_attributes.values()):
            key_attributes = self._extract_key_attributes(
                query_text=query_text,
                top_diamonds=candidate_diamonds[:5] if candidate_diamonds else None,
                top_settings=candidate_settings[:5] if candidate_settings else None
            )
            explicit_attributes = key_attributes.pop('explicit_attributes', set())
        
        # Step 4: Filter by key attributes first (if available)
        # This ensures we prioritize exact matches on metal, color, shape
        attribute_filtered_pairs = []
        if any(key_attributes.values()):
            for diamond in candidate_diamonds:
                for setting in candidate_settings:
                    # Check if attributes match
                    matches = True
                    diamond_meta = diamond.get('metadata', {})
                    setting_meta = setting.get('metadata', {})
                    
                    # Check metal match (mandatory if explicitly mentioned)
                    if key_attributes.get('metal'):
                        setting_metal = str(setting_meta.get('metal', '')).lower()
                        metal_matches = any(m.lower() in setting_metal or setting_metal in m.lower() 
                                          for m in key_attributes['metal'])
                        if 'metal' in explicit_attributes:
                            # Mandatory: must match
                            if not metal_matches:
                                matches = False
                        # If not explicit, we still prefer matches but don't filter out
                    
                    # Check color match (mandatory if explicitly mentioned)
                    if key_attributes.get('color') and matches:
                        diamond_color = str(diamond_meta.get('color', '')).upper()
                        color_matches = any(c.upper() == diamond_color for c in key_attributes['color'])
                        if 'color' in explicit_attributes:
                            # Mandatory: must match
                            if not color_matches:
                                matches = False
                        # If not explicit, we still prefer matches but don't filter out
                    
                    # Shape is already filtered above if explicit, so here we just check for boost
                    # (shape filtering already happened, so all diamonds here match if shape was explicit)
                    
                    if matches:
                        attribute_filtered_pairs.append((diamond, setting))
        
        # If attribute filtering found matches, use those; otherwise use all pairs
        if attribute_filtered_pairs:
            candidate_pairs = attribute_filtered_pairs
        else:
            candidate_pairs = [(d, s) for d in candidate_diamonds for s in candidate_settings]
        
        # Step 5: Pre-filter incompatible combinations (fast, rule-based)
        valid_pairs = []
        for diamond, setting in candidate_pairs:
            if self._quick_compatibility_check(diamond, setting):
                valid_pairs.append((diamond, setting))
        
        # If pre-filtering removed too many, use all candidate pairs
        if len(valid_pairs) < top_k:
            valid_pairs = candidate_pairs
        
        # Step 6: Apply collaborative filtering boost if needed
        collaborative_boost = {}
        if use_collaborative_fallback and self.collaborative_filtering and user_id:
            collaborative_boost = self._get_collaborative_boost(user_id, valid_pairs)
        
        # Step 7: Apply sequential recommendation boost if enabled
        sequential_boost = {}
        if self.use_sequential and user_id and self.user_vector_manager:
            sequential_boost = self._get_sequential_boost(user_id, valid_pairs)
        
        # Step 8: Score only valid combinations with hierarchical weights
        combinations = []
        for diamond, setting in valid_pairs:
            score = self._score_combination(
                query_vec,
                diamond,
                setting,
                user_vector,
                key_attributes=key_attributes,
                has_image_query=has_image_query
            )
            
            # Apply collaborative filtering boost
            diamond_id = diamond.get('metadata', {}).get('id')
            setting_id = setting.get('metadata', {}).get('id')
            combo_key = f"{diamond_id}_{setting_id}"
            
            if combo_key in collaborative_boost:
                score += collaborative_boost[combo_key] * 0.2  # 20% boost from collaborative
            
            # Apply sequential boost
            if combo_key in sequential_boost:
                score += sequential_boost[combo_key] * 0.15  # 15% boost from sequential
            
            diamond_price = diamond.get('metadata', {}).get('price', 0) or 0
            setting_price = setting.get('metadata', {}).get('price', 0) or 0
            
            combinations.append({
                'diamond': diamond,
                'setting': setting,
                'combination_score': score,
                'total_price': diamond_price + setting_price,
                'score_breakdown': {
                    'query_diamond_sim': diamond.get('score', 0.0),
                    'query_setting_sim': setting.get('score', 0.0),
                    'compatibility': self._compute_diamond_setting_compatibility(diamond, setting),
                    'attribute_boost': self._boost_attribute_matches(diamond, setting, key_attributes) if key_attributes else 0.0,
                    'user_alignment': 0.0,  # Will be computed in _score_combination if user_vector exists
                    'collaborative_boost': collaborative_boost.get(combo_key, 0.0),
                    'sequential_boost': sequential_boost.get(combo_key, 0.0)
                }
            })
        
        # Step 9: Apply diversity penalty to avoid too similar recommendations
        if self.diversity_weight > 0:
            combinations = self._apply_diversity_penalty(combinations, top_k)
        
        # Step 10: Sort by score and return top-k
        combinations.sort(key=lambda x: x['combination_score'], reverse=True)
        return combinations[:top_k]
    
    def _get_collaborative_boost(
        self,
        user_id: str,
        candidate_pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]
    ) -> Dict[str, float]:
        """
        Get collaborative filtering boost scores for candidate pairs.
        
        Args:
            user_id: User identifier
            candidate_pairs: List of (diamond, setting) tuples
            
        Returns:
            Dictionary mapping combo_key to boost score
        """
        if not self.collaborative_filtering:
            return {}
        
        boost_scores = {}
        
        # Get user vectors for collaborative filtering
        if self.user_vector_manager:
            all_user_ids = list(self.user_vector_manager.user_data.keys())
            user_vectors = {}
            for uid in all_user_ids:
                vec = self.user_vector_manager.get_user_vector(uid)
                if vec is not None:
                    user_vectors[uid] = vec
            
            # Find similar users
            if user_id in user_vectors:
                similar_users = self.collaborative_filtering.compute_user_user_similarity(
                    user_id, user_vectors, top_k=10
                )
                
                # Get items liked by similar users
                similar_user_items = set()
                for sim_user_id, _ in similar_users:
                    if sim_user_id in self.collaborative_filtering.user_interactions:
                        for item_id, _, _ in self.collaborative_filtering.user_interactions[sim_user_id]:
                            similar_user_items.add(item_id)
                
                # Boost pairs that contain items liked by similar users
                for diamond, setting in candidate_pairs:
                    diamond_id = str(diamond.get('metadata', {}).get('id', ''))
                    setting_id = str(setting.get('metadata', {}).get('id', ''))
                    combo_key = f"{diamond_id}_{setting_id}"
                    
                    if diamond_id in similar_user_items or setting_id in similar_user_items:
                        boost_scores[combo_key] = 1.0
        
        return boost_scores
    
    def _get_sequential_boost(
        self,
        user_id: str,
        candidate_pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]
    ) -> Dict[str, float]:
        """
        Get sequential recommendation boost based on interaction order.
        
        Considers recent interactions to predict next likely preferences.
        
        Args:
            user_id: User identifier
            candidate_pairs: List of (diamond, setting) tuples
            
        Returns:
            Dictionary mapping combo_key to boost score
        """
        if not self.user_vector_manager or user_id not in self.user_vector_manager.user_data:
            return {}
        
        user_data = self.user_vector_manager.user_data[user_id]
        interactions = user_data.get('interactions', [])
        
        if len(interactions) < 2:
            return {}  # Need at least 2 interactions for sequential patterns
        
        # Get most recent interactions (last 5)
        recent_interactions = interactions[-5:] if len(interactions) > 5 else interactions
        
        # Extract embeddings from recent interactions
        recent_embeddings = []
        for interaction in recent_interactions:
            emb = interaction.get('item_embedding')
            if emb is not None:
                if isinstance(emb, list):
                    emb = np.array(emb)
                recent_embeddings.append(emb)
        
        if not recent_embeddings:
            return {}
        
        # Compute trend vector (direction of recent preferences)
        recent_embeddings = np.array(recent_embeddings)
        trend_vector = np.mean(recent_embeddings, axis=0)
        norm = np.linalg.norm(trend_vector)
        if norm > 0:
            trend_vector = trend_vector / norm
        
        # Score pairs based on similarity to trend
        boost_scores = {}
        for diamond, setting in candidate_pairs:
            diamond_id = diamond.get('metadata', {}).get('id')
            setting_id = setting.get('metadata', {}).get('id')
            combo_key = f"{diamond_id}_{setting_id}"
            
            try:
                diamond_idx = int(diamond_id)
                setting_idx = int(setting_id)
                
                diamond_emb = self.diamond_engine.embeddings[diamond_idx]
                setting_emb = self.setting_engine.embeddings[setting_idx]
                combo_emb = (diamond_emb + setting_emb) / 2.0
                norm = np.linalg.norm(combo_emb)
                if norm > 0:
                    combo_emb = combo_emb / norm
                
                # Similarity to trend
                similarity = np.dot(trend_vector, combo_emb)
                boost_scores[combo_key] = max(0.0, similarity)
            except (IndexError, ValueError, KeyError):
                continue
        
        return boost_scores
    
    def _apply_diversity_penalty(
        self,
        combinations: List[Dict[str, Any]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Apply diversity penalty to avoid too similar recommendations.
        
        Uses Maximal Marginal Relevance (MMR) approach.
        
        Args:
            combinations: List of combination dictionaries
            top_k: Number of top results to return
            
        Returns:
            Re-ranked combinations with diversity applied
        """
        if len(combinations) <= top_k:
            return combinations
        
        # Select diverse set
        selected = []
        remaining = combinations.copy()
        
        # First item: highest score
        if remaining:
            selected.append(remaining.pop(0))
        
        # Subsequent items: balance score and diversity
        while len(selected) < top_k and remaining:
            best_idx = 0
            best_score = float('-inf')
            
            for idx, combo in enumerate(remaining):
                # Score = relevance - diversity_penalty
                relevance = combo['combination_score']
                
                # Diversity penalty: similarity to already selected items
                max_similarity = 0.0
                diamond_emb = None
                setting_emb = None
                
                try:
                    diamond_id = combo['diamond'].get('metadata', {}).get('id')
                    setting_id = combo['setting'].get('metadata', {}).get('id')
                    diamond_idx = int(diamond_id)
                    setting_idx = int(setting_id)
                    
                    diamond_emb = self.diamond_engine.embeddings[diamond_idx]
                    setting_emb = self.setting_engine.embeddings[setting_idx]
                except (IndexError, ValueError, KeyError):
                    pass
                
                if diamond_emb is not None and setting_emb is not None:
                    combo_emb = (diamond_emb + setting_emb) / 2.0
                    norm = np.linalg.norm(combo_emb)
                    if norm > 0:
                        combo_emb = combo_emb / norm
                    
                    for selected_combo in selected:
                        try:
                            sel_diamond_id = selected_combo['diamond'].get('metadata', {}).get('id')
                            sel_setting_id = selected_combo['setting'].get('metadata', {}).get('id')
                            sel_diamond_idx = int(sel_diamond_id)
                            sel_setting_idx = int(sel_setting_id)
                            
                            sel_diamond_emb = self.diamond_engine.embeddings[sel_diamond_idx]
                            sel_setting_emb = self.setting_engine.embeddings[sel_setting_idx]
                            sel_combo_emb = (sel_diamond_emb + sel_setting_emb) / 2.0
                            norm = np.linalg.norm(sel_combo_emb)
                            if norm > 0:
                                sel_combo_emb = sel_combo_emb / norm
                            
                            similarity = np.dot(combo_emb, sel_combo_emb)
                            max_similarity = max(max_similarity, similarity)
                        except (IndexError, ValueError, KeyError):
                            continue
                
                # MMR score: relevance - lambda * max_similarity
                mmr_score = relevance - self.diversity_weight * max_similarity
                
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx
            
            if remaining:
                selected.append(remaining.pop(best_idx))
        
        return selected

