# Luxury Jewelry Recommender System

A production-grade personalized recommendation system for luxury jewelry using multimodal embeddings, collaborative filtering, and advanced machine learning techniques. This system enables semantic search and personalized recommendations for diamond and setting combinations using SigLIP embeddings, FAISS-based retrieval, and user preference modeling.

## Overview

This system provides:
- **Multimodal Search**: Text, image, or combined queries using SigLIP vision-language model
- **Personalized Recommendations**: Diamond + setting combinations tailored to user preferences
- **Three Datasets**:
  - **Cartier Catalog**: 261 rings with images and rich descriptions
  - **Diamonds Dataset**: 219,705 diamonds with structured attributes
  - **Settings Dataset**: Ring settings for combination recommendations
- **Advanced Filtering**: Price, metal, shape, color, clarity, carat weight
- **FAISS-based Retrieval**: Fast similarity search with filtering
- **User Vector Management**: Hybrid approach combining explicit preferences and interaction history
- **Collaborative Filtering**: User-user and item-item similarity for cold-start handling

## System Architecture

```
┌─────────────┐
│   React UI  │ (Luxury Jewellery Recommender Page-2)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  FastAPI    │
│   Backend   │
└──────┬──────┘
       │
       ├──► SigLIP Model (Embeddings)
       ├──► FAISS Index (Retrieval)
       ├──► PersonalizedRecommender
       └──► UserVectorManager
```

### Core Components

1. **Embedding Generation** (`src/embedding_utils.py`): SigLIP model for text and image embeddings
2. **Retrieval Engine** (`src/retrieval_engine.py`): FAISS-based similarity search
3. **Personalized Recommender** (`src/personalized_recommender.py`): Diamond-setting combination scoring with sequential recommendations
4. **User Vector Manager** (`src/user_vector_manager.py`): User preference modeling with temporal decay
5. **Collaborative Filtering** (`src/collaborative_filtering.py`): User-user and item-item similarity for cold-start handling
6. **Filters** (`src/filters.py`): Attribute-based filtering
7. **API** (`api/main.py`): FastAPI REST endpoints

## User Vector Management

The system uses a **hybrid approach** to model user preferences:

### Components

1. **Explicit Preferences**: User-provided preferences (metal, style, price range, diamond color/shape)
   - Converted to text description
   - Embedded using SigLIP
   - Stored as normalized vector

2. **Interaction History**: User interactions with items (clicks, likes, purchases)
   - Each interaction includes item embedding
   - Weighted by interaction type (purchase > like > click)
   - Averaged to create interaction vector

3. **Combined Vector**: Weighted combination of preferences and interactions
   ```
   user_vector = 0.6 * preferences_vector + 0.4 * interaction_vector
   ```
   - Default weights: 60% preferences, 40% interactions
   - Both vectors normalized before combination
   - Final vector normalized to unit length

### Storage

- User vectors stored in `data/user_vectors.json`
- Format:
  ```json
  {
    "user_id": {
      "preferences": [embedding_vector],
      "preferences_text": "prefers rose gold, vintage style...",
      "interactions": [interaction_objects],
      "interaction_embeddings": [[embedding_vectors]]
    }
  }
  ```

### Temporal Decay

Recent interactions are weighted more heavily using exponential decay:
- Recent interactions: higher weight
- Older interactions: lower weight
- Default half-life: 30 days (configurable)
- Formula: `weight = 2^(-days_since / half_life_days)`
- Helps adapt to changing user preferences

### Collaborative Filtering Initialization

For cold-start users (no interaction history), the system can initialize user vectors from similar users:
- Finds similar users based on user-user similarity
- Weighted average of similar users' vectors
- Provides better initial recommendations for new users

## Similarity Computation

### Cosine Similarity

The system uses **cosine similarity** for all embedding comparisons:

```python
similarity = dot(query_vector, item_vector) / (||query_vector|| * ||item_vector||)
```

Since all embeddings are normalized (unit length), this simplifies to:
```python
similarity = dot(query_vector, item_vector)
```

### Query-Item Matching

1. **Query Embedding**: Generated from text, image, or both
   - Text-only: 100% text embedding
   - Image-only: 100% image embedding
   - Both: 50% text + 50% image (fused)

2. **Item Embeddings**: Precomputed for all items
   - Cartier rings: 60% image + 40% text (if image available)
   - Diamonds: 100% text (structured attributes)
   - Settings: 100% text (structured attributes)

3. **Similarity Score**: Cosine similarity between query and item embeddings

### Diamond-Setting Compatibility Scoring

The system computes compatibility between diamonds and settings using rule-based matching:

1. **Metal-Color Matching**:
   - Premium diamonds (D, E, F) → Platinum/White Gold
   - Mid-range (G, H, I) → All metals
   - Lower colors (J, K, L) → Yellow/Rose Gold

2. **Style Matching**:
   - Round brilliant → Most styles
   - Fancy shapes → Vintage/Classic styles

3. **Price Compatibility**:
   - Setting should be 20-40% of total price (diamond + setting)

4. **Carat-Size Matching**:
   - Large diamonds (>2 carat) → Sturdy settings
   - Small diamonds (<0.5 carat) → Delicate settings

## Recommender System

### PersonalizedRecommender Class

The `PersonalizedRecommender` class combines multiple signals to score diamond-setting combinations:

#### Hierarchical Scoring

The final score combines:

1. **Image/Query Similarity** (30-50% weight)
   - Average of query-diamond and query-setting similarity
   - Higher weight when image query provided

2. **Attribute Matching** (30-40% weight)
   - Metal, color, shape matches from query
   - Boost for exact attribute matches

3. **Compatibility Score** (10-20% weight)
   - Diamond-setting compatibility (rule-based)

4. **User Preference Alignment** (10% weight)
   - Cosine similarity with user vector
   - Only applied if user vector exists

#### Scoring Formula

```python
if has_image_query:
    score = 0.5 * image_similarity + 0.3 * attribute_boost + 0.1 * compatibility + 0.1 * user_alignment
else:
    score = 0.3 * image_similarity + 0.4 * attribute_boost + 0.2 * compatibility + 0.1 * user_alignment
```

#### Attribute Extraction

The system extracts key attributes from query text:
- **Metals**: platinum, white gold, yellow gold, rose gold
- **Colors**: D, E, F, G, H, I, J, K, L, M, N
- **Shapes**: round, princess, cushion, oval, emerald, pear, marquise, asscher, radiant, heart

If not found in text, attributes are inferred from top search results.

#### Sequential Recommendations

The system considers interaction order to predict next preferences:
- **Trend Vector**: Computed from recent interactions (last 5)
- **Sequential Boost**: Items similar to trend vector get boosted
- Helps capture evolving user preferences over time

#### Collaborative Filtering Fallback

When user vector is sparse or missing, the system uses collaborative filtering:
- **User-User Similarity**: Finds similar users based on interaction patterns
- **Item-Item Similarity**: Finds similar items based on user interactions
- **Hybrid Approach**: Combines content-based and collaborative signals
- Automatically activates for cold-start users

#### Diversity Metrics

To avoid too similar recommendations, the system uses Maximal Marginal Relevance (MMR):
- Balances relevance and diversity
- Penalizes items too similar to already-selected recommendations
- Ensures variety in top-k results

## Collaborative Filtering

The system includes a dedicated collaborative filtering module (`src/collaborative_filtering.py`) for enhanced personalization:

### User-User Similarity

Two methods for finding similar users:

1. **Vector-based**: Cosine similarity on user preference vectors
   - Fast and accurate for users with rich profiles
   - Works best when users have explicit preferences

2. **Interaction-based**: Jaccard similarity on interaction overlap
   - Works even without explicit preferences
   - Based on items users have interacted with

### Item-Item Similarity

Two methods for finding similar items:

1. **Content-based**: Cosine similarity on item embeddings
   - Uses SigLIP embeddings
   - Captures semantic similarity

2. **Collaborative**: Jaccard similarity on user interaction overlap
   - Items liked by same users are similar
   - Captures behavioral patterns

### Cold-Start Handling

For new users with no interaction history:
- Uses content-based similarity between query and items
- Falls back to item-item collaborative similarity
- Provides reasonable recommendations even without user data

### Integration

Collaborative filtering is automatically integrated into the recommendation pipeline:
- Activates when user vector is sparse (< 3 interactions)
- Provides boost scores for items liked by similar users
- Seamlessly combines with content-based recommendations

## Embeddings

### SigLIP Model

- **Model**: `google/siglip-base-patch16-224`
- **Embedding Dimension**: 768
- **Features**:
  - Vision-language model for fine-grained visual alignment
  - Handles both text and images
  - Normalized embeddings (unit length)

### Embedding Generation

#### Precomputation

Embeddings are precomputed for all items:

1. **Cartier Rings**:
   ```bash
   python scripts/precompute_cartier_embeddings.py
   ```
   - Generates: `embeddings/cartier_embeddings.npy`
   - Metadata: `embeddings/cartier_metadata.json`
   - Time: ~5-10 minutes for 261 items

2. **Diamonds**:
   ```bash
   python scripts/precompute_diamond_embeddings.py
   ```
   - Generates: `embeddings/diamond_embeddings.npy`
   - Metadata: `embeddings/diamond_metadata.json`
   - Time: ~2-4 hours for 219K items (depending on hardware)

3. **Settings**:
   ```bash
   python scripts/precompute_setting_embeddings.py
   ```
   - Generates: `embeddings/setting_embeddings.npy`
   - Metadata: `embeddings/setting_metadata.json`

#### Embedding Strategy

- **Cartier Rings**: 60% image + 40% text (multimodal fusion)
- **Diamonds**: 100% text (structured attributes)
- **Settings**: 100% text (structured attributes)
- **Query**: 50% text + 50% image (if both provided)

### Normalization

All embeddings are normalized to unit length:
```python
embedding = embedding / ||embedding||
```

This enables efficient cosine similarity computation using dot product.

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+ (for frontend)
- 8GB+ RAM (for model loading)
- GPU recommended (but works on CPU)

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Precompute embeddings** (if not already done):
   ```bash
   # Cartier catalog
   python scripts/precompute_cartier_embeddings.py
   
   # Diamonds dataset
   python scripts/precompute_diamond_embeddings.py
   
   # Settings dataset
   python scripts/precompute_setting_embeddings.py
   ```

3. **Run the API**:
   ```bash
   cd api
   python main.py
   ```
   
   Or using uvicorn:
   ```bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd "Luxury Jewellery Recommender Page-2"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` (or similar)

### Quick Start Scripts

- `start_backend.sh`: Start backend server
- `start_frontend.sh`: Start frontend server
- `run_app.sh`: Start both (if configured)

## File Structure

```
158-ASS2/
├── api/                          # FastAPI backend
│   ├── main.py                   # Main API application
│   └── utils.py                 # API utilities
├── src/                          # Core Python modules
│   ├── embedding_utils.py       # SigLIP embedding functions
│   ├── retrieval_engine.py      # FAISS-based search
│   ├── personalized_recommender.py  # Recommendation logic
│   ├── user_vector_manager.py    # User preference management
│   ├── filters.py                # Attribute filtering
│   ├── data_preprocessing.py    # Data processing utilities
│   └── settings_extractor.py    # Settings extraction
├── scripts/                      # Utility scripts
│   ├── precompute_*.py          # Embedding generation scripts
│   ├── test_*.py                # Testing scripts
│   └── validate_system.py       # System validation
├── embeddings/                   # Precomputed embeddings (gitignored)
│   ├── *_embeddings.npy         # NumPy arrays of embeddings
│   └── *_metadata.json          # Item metadata
├── data/                         # Data storage
│   ├── user_vectors.json        # User preference vectors
│   └── images/                   # Cartier ring images (if available)
├── frontend/                      # Simple React frontend (legacy)
│   └── src/
├── Luxury Jewellery Recommender Page-2/  # Main React frontend
│   └── src/
│       ├── App.tsx              # Main application component
│       ├── components/         # React components
│       ├── api/                # API client
│       └── utils/              # Utility functions
├── tests/                       # Test files
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## API Endpoints

### `POST /api/recommend`

Main recommendation endpoint. Supports text-only, image-only, or multimodal queries.

**Parameters** (multipart/form-data):
- `query_text` (optional): Text query string
- `image` (optional): Image file
- `dataset`: "cartier", "diamonds", or "personalized"
- `top_k`: Number of results (default: 10, max: 100)
- `price_min`, `price_max`: Price range filters
- `metal`: Metal type (comma-separated for multiple)
- `style`: Style (comma-separated for multiple)
- `shape`: Diamond shape (comma-separated)
- `color`: Diamond color (comma-separated)
- `clarity`: Diamond clarity (comma-separated)
- `carat_min`, `carat_max`: Carat range

**Response**:
```json
{
  "results": [
    {
      "id": "item_id",
      "similarity_score": 0.95,
      "metadata": {...}
    }
  ],
  "query_info": {
    "query_type": "multimodal",
    "dataset": "personalized",
    "num_results": 10,
    "embedding_dim": 768
  }
}
```

**Example**:
```bash
curl -X POST "http://localhost:8000/api/recommend" \
  -F "query_text=hidden halo yellow gold" \
  -F "dataset=personalized" \
  -F "top_k=5" \
  -F "price_min=1000" \
  -F "price_max=5000"
```

### `POST /api/user/preferences`

Update user explicit preferences.

**Parameters**:
- `user_id` (required): User identifier
- `metal`: Preferred metal type
- `style`: Preferred style
- `price_min`, `price_max`: Price range
- `diamond_color`: Preferred diamond color
- `diamond_shape`: Preferred diamond shape

**Response**:
```json
{
  "status": "success",
  "user_id": "user123",
  "preferences": {...}
}
```

### `POST /api/user/interactions`

Log user interaction for personalization.

**Parameters**:
- `user_id` (required): User identifier
- `item_id` (required): Item identifier
- `item_type`: "diamond" or "setting"
- `interaction_type`: "click", "like", or "purchase" (default: "click")

**Response**:
```json
{
  "status": "success",
  "user_id": "user123",
  "item_id": "diamond_456",
  "interaction_type": "like"
}
```

### `GET /api/health`

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "cartier_engine_loaded": true,
  "diamonds_engine_loaded": true
}
```

### `GET /api/stats`

Get statistics about loaded datasets.

**Response**:
```json
{
  "model": {
    "device": "cuda"
  },
  "cartier": {
    "dataset_type": "cartier",
    "num_items": 261,
    "embedding_dim": 768,
    "index_type": "flat"
  },
  "diamonds": {
    "dataset_type": "diamonds",
    "num_items": 219705,
    "embedding_dim": 768,
    "index_type": "hnsw"
  }
}
```

## FAISS Index

The system uses FAISS for efficient similarity search:

- **Small datasets (<10K)**: `IndexFlatIP` (exact search, fast)
- **Large datasets (>10K)**: `IndexHNSWFlat` (approximate, no training required)
- **Index type auto-selected** based on dataset size

### Performance

- **Search latency**: <10ms for Cartier, <50ms for Diamonds (with filters)
- **API response time**: <500ms (including embedding generation)
- **Embedding generation**: ~0.1-0.5s per item (CPU), ~0.01-0.05s (GPU)

## Testing

Run tests:
```bash
# Embedding tests
python tests/test_embeddings.py

# Retrieval tests
python tests/test_retrieval.py

# API tests (requires running API)
python tests/test_api.py

# Personalized recommender tests
python scripts/test_personalized.py
```

## Troubleshooting

### Models not loading
- Ensure sufficient RAM (8GB+)
- Check internet connection (first run downloads models)
- Try reducing batch size in embedding scripts

### Images not found
- Cartier images may not be available locally
- System falls back to text-only embeddings
- Check `IMAGE_BASE_PATH` in precompute scripts

### Out of memory
- Use CPU instead of GPU
- Process embeddings in smaller batches
- Use `IndexHNSWFlat` for large datasets (already default)

### Embeddings not found
- Run precomputation scripts first
- Check `embeddings/` directory exists
- Verify `.npy` and `.json` files are present

## Future Improvements

- [ ] Matrix factorization for latent factor modeling
- [ ] Sequential recommendation (Markov chains)
- [ ] Diversity metrics in recommendations
- [ ] Real-time embedding updates
- [ ] Batch embedding API endpoint
- [ ] Advanced ranking with learning-to-rank
- [ ] Collaborative filtering endpoints
- [ ] User-user similarity computation

## License

This project is for educational purposes (CSE 158 Assignment 2).

## Acknowledgments

- SigLIP model by Google Research
- HuggingFace Transformers library
- FAISS by Facebook Research
