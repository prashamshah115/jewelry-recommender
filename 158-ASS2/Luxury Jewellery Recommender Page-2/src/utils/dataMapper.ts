import { ApiResult, DatasetType } from "../api/types";

const DEFAULT_RING_IMAGE =
  "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80";
const DEFAULT_DIAMOND_IMAGE =
  "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?auto=format&fit=crop&w=600&q=80";

export interface DiamondDisplay {
  carat: number;
  cut: string;
  color: string;
  clarity: string;
  price: number;
  image: string;
  shape: string;
}

export interface SettingDisplay {
  metal: string;
  style: string;
  price: number;
  image: string;
  name: string;
}

export interface RecommendationDisplay {
  id: string;
  diamond: DiamondDisplay;
  setting: SettingDisplay;
  matchScore: number;
  rawMetadata: Record<string, unknown>;
}

type CartierMetadata = {
  title?: string;
  price?: number;
  description?: string;
  image_path?: string;
  metals?: string[];
  gemstones?: string[];
  styles?: string[];
  band_width_mm?: number;
  [key: string]: unknown;
};

type DiamondMetadata = {
  carat_weight?: number;
  cut?: string;
  color?: string;
  clarity?: string;
  price?: number;
  shape?: string;
  lab?: string;
  meas_length?: number;
  meas_width?: number;
  meas_depth?: number;
  image_path?: string;
  [key: string]: unknown;
};

type SettingMetadata = {
  id?: string;
  name?: string;
  metal?: string;
  style?: string;
  price?: number;
  image_path?: string;
  description?: string;
  band_width_mm?: number;
  [key: string]: unknown;
};

type PersonalizedResult = {
  diamond: DiamondMetadata;
  setting: SettingMetadata;
  combination_score?: number;
  total_price?: number;
  score_breakdown?: Record<string, number>;
};

const formatMatchScore = (score?: number) => {
  if (!score && score !== 0) return 0;
  return Math.min(100, Math.max(0, Math.round(score * 100)));
};

const ensureImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Attempt to construct CDN path if available (Cartier images)
  if (url.startsWith("/content/dam/")) {
    // Try Cartier CDN first, but will fallback to placeholder if it fails
    return `https://www.cartier.com${url}`;
  }
  // If it's a relative path, try to serve from local images directory
  if (url.startsWith("/images/") || url.startsWith("images/")) {
    return url.startsWith("/") ? url : `/${url}`;
  }
  return url;
};

const createDiamondPlaceholder = (metadata: CartierMetadata | DiamondMetadata): DiamondDisplay => {
  const diamondMetadata = metadata as DiamondMetadata;
  return {
    carat: Number(diamondMetadata.carat_weight ?? 1),
    cut: diamondMetadata.cut ?? (metadata.styles?.[0] ?? "Brilliant"),
    color: diamondMetadata.color ?? "G",
    clarity: diamondMetadata.clarity ?? "VS2",
    price: diamondMetadata.price
      ? Number(diamondMetadata.price)
      : Math.round(((metadata as CartierMetadata).price ?? 5000) * 0.65),
    image: "", // No diamond images available
    shape: diamondMetadata.shape ?? diamondMetadata.cut ?? "Round",
  };
};

const createSettingPlaceholder = (metadata: CartierMetadata): SettingDisplay => ({
  metal: metadata.metals?.[0] ?? "Platinum",
  style: metadata.styles?.join(", ") ?? "Signature Style",
  price: Math.round((metadata.price ?? 5000) * 0.35),
  image: ensureImageUrl(metadata.image_path) ?? DEFAULT_RING_IMAGE,
  name: metadata.title ?? "Luxury Setting",
});

const mapCartierResult = (result: ApiResult<CartierMetadata>): RecommendationDisplay => {
  const metadata = result.metadata ?? {};
  const diamond = createDiamondPlaceholder(metadata);
  const setting = createSettingPlaceholder(metadata);

  return {
    id: result.id,
    diamond,
    setting,
    matchScore: formatMatchScore(result.similarity_score),
    rawMetadata: metadata,
  };
};

const mapDiamondResult = (result: ApiResult<DiamondMetadata>): RecommendationDisplay => {
  const metadata = result.metadata ?? {};
  const diamond: DiamondDisplay = {
    carat: Number(metadata.carat_weight ?? 1),
    cut: metadata.cut ?? "Brilliant",
    color: metadata.color ?? "G",
    clarity: metadata.clarity ?? "VS2",
    price: Number(metadata.price ?? 0),
    image: "", // No diamond images available
    shape: metadata.shape ?? metadata.cut ?? "Round",
  };

  const setting: SettingDisplay = {
    metal: "Platinum",
    style: "Signature Solitaire",
    price: Math.round(diamond.price * 0.3) || 2000,
    image: DEFAULT_RING_IMAGE,
    name: "Curated Setting",
  };

  return {
    id: result.id,
    diamond,
    setting,
    matchScore: formatMatchScore(result.similarity_score),
    rawMetadata: metadata,
  };
};

const mapPersonalizedResult = (result: PersonalizedResult): RecommendationDisplay => {
  const diamondMeta = result.diamond ?? {};
  const settingMeta = result.setting ?? {};

  const diamond: DiamondDisplay = {
    carat: Number(diamondMeta.carat_weight ?? 1),
    cut: diamondMeta.cut ?? "Brilliant",
    color: diamondMeta.color ?? "G",
    clarity: diamondMeta.clarity ?? "VS2",
    price: Number(diamondMeta.price ?? 0),
    image: "", // No diamond images available
    shape: diamondMeta.shape ?? diamondMeta.cut ?? "Round",
  };

  const setting: SettingDisplay = {
    metal: settingMeta.metal ?? "Platinum",
    style: settingMeta.style ?? "Signature",
    price: Number(settingMeta.price ?? 0),
    image: ensureImageUrl(settingMeta.image_path) ?? DEFAULT_RING_IMAGE,
    name: settingMeta.name ?? "Curated Setting",
  };

  return {
    id: `${diamondMeta.id ?? 'diamond'}_${settingMeta.id ?? 'setting'}`,
    diamond,
    setting,
    matchScore: formatMatchScore(result.combination_score),
    rawMetadata: {
      diamond: diamondMeta,
      setting: settingMeta,
      combination_score: result.combination_score,
      total_price: result.total_price,
      score_breakdown: result.score_breakdown,
    },
  };
};

export const mapResultsToRecommendations = (
  dataset: DatasetType,
  results: ApiResult[] | PersonalizedResult[],
): RecommendationDisplay[] => {
  if (!results?.length) return [];

  if (dataset === "personalized") {
    return results.map((result) =>
      mapPersonalizedResult(result as PersonalizedResult)
    );
  }

  return results.map((result) =>
    dataset === "cartier"
      ? mapCartierResult(result as ApiResult<CartierMetadata>)
      : mapDiamondResult(result as ApiResult<DiamondMetadata>),
  );
};

