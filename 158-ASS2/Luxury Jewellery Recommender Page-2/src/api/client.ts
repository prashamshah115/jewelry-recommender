import { SearchParams, SearchResponse, ApiError, DatasetType } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8000";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;

const API_ENDPOINTS = {
  recommend: "/api/recommend",
  health: "/api/health",
  stats: "/api/stats",
} as const;

type Entries<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T][];

const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null;

const normalizeArrayParam = (value?: string | string[]) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const buildFilters = (dataset: DatasetType, filters?: SearchParams["filters"]) => {
  if (!filters) return {};
  const baseFilters: Record<string, string> = {};

  if (isDefined(filters.price_min)) baseFilters.price_min = String(filters.price_min);
  if (isDefined(filters.price_max)) baseFilters.price_max = String(filters.price_max);

  if (dataset === "cartier") {
    const cartierFilters = filters as SearchParams["filters"];
    const metals = normalizeArrayParam(cartierFilters?.metal);
    if (metals?.length) baseFilters.metal = metals.join(",");
    const styles = normalizeArrayParam(cartierFilters?.style);
    if (styles?.length) baseFilters.style = styles.join(",");
  } else if (dataset === "personalized") {
    // Personalized needs both diamond and setting filters
    const personalizedFilters = filters as SearchParams["filters"];
    
    // Diamond filters
    const shapes = normalizeArrayParam(personalizedFilters?.shape);
    const colors = normalizeArrayParam(personalizedFilters?.color);
    const clarities = normalizeArrayParam(personalizedFilters?.clarity);
    
    if (shapes?.length) baseFilters.shape = shapes.join(",");
    if (colors?.length) baseFilters.color = colors.join(",");
    if (clarities?.length) baseFilters.clarity = clarities.join(",");
    if (isDefined(personalizedFilters?.carat_min))
      baseFilters.carat_min = String(personalizedFilters?.carat_min);
    if (isDefined(personalizedFilters?.carat_max))
      baseFilters.carat_max = String(personalizedFilters?.carat_max);
    
    // Setting filters
    const metals = normalizeArrayParam(personalizedFilters?.metal);
    if (metals?.length) baseFilters.metal = metals.join(",");
    const styles = normalizeArrayParam(personalizedFilters?.style);
    if (styles?.length) baseFilters.style = styles.join(",");
  } else {
    // Diamonds only
    const diamondFilters = filters as SearchParams["filters"];
    const shapes = normalizeArrayParam(diamondFilters?.shape);
    const colors = normalizeArrayParam(diamondFilters?.color);
    const clarities = normalizeArrayParam(diamondFilters?.clarity);

    if (shapes?.length) baseFilters.shape = shapes.join(",");
    if (colors?.length) baseFilters.color = colors.join(",");
    if (clarities?.length) baseFilters.clarity = clarities.join(",");
    if (isDefined(diamondFilters?.carat_min))
      baseFilters.carat_min = String(diamondFilters?.carat_min);
    if (isDefined(diamondFilters?.carat_max))
      baseFilters.carat_max = String(diamondFilters?.carat_max);
  }

  return baseFilters;
};

export const searchJewelry = async <TMetadata = Record<string, unknown>>(
  params: SearchParams,
): Promise<SearchResponse<TMetadata>> => {
  const formData = new FormData();

  if (params.queryText) formData.append("query_text", params.queryText);
  if (params.imageFile) formData.append("image", params.imageFile);
  formData.append("dataset", params.dataset);
  formData.append("top_k", String(params.topK ?? 10));

  const filters = buildFilters(params.dataset, params.filters);
  (Object.entries(filters) as Entries<typeof filters>).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.recommend}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await safeParseJSON(response);
    throw <ApiError>{
      message: errorBody?.detail ?? "Failed to fetch recommendations",
      status: response.status,
      details: errorBody,
    };
  }

  return (await response.json()) as SearchResponse<TMetadata>;
};

export const getHealth = async () => {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.health}`);
  if (!response.ok) {
    throw <ApiError>{
      message: "Health check failed",
      status: response.status,
    };
  }
  return response.json();
};

export const getStats = async () => {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.stats}`);
  if (!response.ok) {
    throw <ApiError>{
      message: "Failed to fetch stats",
      status: response.status,
    };
  }
  return response.json();
};

const safeParseJSON = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};



