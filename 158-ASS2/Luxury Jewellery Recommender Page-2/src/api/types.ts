export type DatasetType = "cartier" | "diamonds" | "personalized";

export interface BaseFilters {
  price_min?: number;
  price_max?: number;
}

export interface CartierFilters extends BaseFilters {
  metal?: string[];
  style?: string[];
}

export interface DiamondFilters extends BaseFilters {
  shape?: string[];
  color?: string[];
  clarity?: string[];
  carat_min?: number;
  carat_max?: number;
}

export interface PersonalizedFilters extends BaseFilters {
  // Diamond filters
  shape?: string[];
  color?: string[];
  clarity?: string[];
  carat_min?: number;
  carat_max?: number;
  // Setting filters
  metal?: string[];
  style?: string[];
}

export type SearchFilters = CartierFilters | DiamondFilters | PersonalizedFilters;

export interface SearchParams {
  queryText?: string;
  imageFile?: File | null;
  dataset: DatasetType;
  topK?: number;
  filters?: SearchFilters;
}

export interface ApiResult<TMetadata = Record<string, unknown>> {
  id: string;
  similarity_score: number;
  metadata: TMetadata;
}

export interface PersonalizedResult {
  diamond: Record<string, unknown>;
  setting: Record<string, unknown>;
  combination_score?: number;
  total_price?: number;
  score_breakdown?: Record<string, number>;
}

export interface SearchResponse<TMetadata = Record<string, unknown>> {
  results: ApiResult<TMetadata>[] | PersonalizedResult[];
  query_info: {
    query_type: "text" | "image" | "multimodal" | "personalized";
    dataset: DatasetType;
    num_results: number;
    embedding_dim: number;
    user_id?: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}



