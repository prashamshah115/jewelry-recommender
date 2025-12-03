"""
Test personalized recommendation endpoint.
"""

import sys
sys.path.insert(0, 'api')
sys.path.insert(0, 'src')

from embedding_utils import embed_text, load_siglip_model, get_device
from personalized_recommender import PersonalizedRecommender
from retrieval_engine import load_retrieval_engine

# Load model
print("Loading SigLIP model...")
processor, model = load_siglip_model('google/siglip-base-patch16-224')
device = get_device()

# Embed query
query_text = 'vintage rose gold ring'
print(f"\nEmbedding query: '{query_text}'")
query_vec = embed_text(query_text, processor, model, device)
print(f'✅ Query embedded: shape {query_vec.shape}')

# Load engines
print("\nLoading engines...")
diamond_engine = load_retrieval_engine('diamonds', 'embeddings')
setting_engine = load_retrieval_engine('settings', 'embeddings')
print("✅ Engines loaded")

# Test personalized recommender
print("\nTesting personalized recommender...")
recommender = PersonalizedRecommender(
    diamond_engine=diamond_engine,
    setting_engine=setting_engine
)

combinations = recommender.recommend_combinations(
    query_vec=query_vec,
    top_k=3
)

print(f'\n✅ Personalized recommendations: {len(combinations)} combinations')
for i, combo in enumerate(combinations):
    diamond = combo['diamond']['metadata']
    setting = combo['setting']['metadata']
    print(f'\n  {i+1}. Score: {combo["combination_score"]:.4f}, Total Price: ${combo["total_price"]:.2f}')
    print(f'     Diamond: {diamond.get("carat_weight", "?")}ct, {diamond.get("color", "?")}, {diamond.get("cut", "?")}')
    print(f'     Setting: {setting.get("name", "?")}, {setting.get("metal", "?")}, {setting.get("style", "?")}')

print("\n✅ All tests passed!")


