import type { Logger } from "winston";
import type { LlmClient } from "./LlmClient.js";

const NEWS_ENDPOINT = "https://bbc-news-api.vercel.app/latest?lang=english";
const CACHE_TTL_MS = 15 * 60 * 1000;

export type NewsItem = {
  title: string;
  summary: string | null;
  image: string | null;
  link: string | null;
  category: string;
};

export type NewsSnapshot = {
  fetchedAt: number;
  items: NewsItem[];
  categories: Map<string, NewsItem[]>;
};

export type ScoredNewsItem = NewsItem & { score: number };

type RawNewsItem = {
  title?: unknown;
  summary?: unknown;
  image_link?: unknown;
  news_link?: unknown;
};

type RawNewsResponse = Record<string, unknown>;

const toText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildEmbeddingText = (item: NewsItem): string => {
  const summary = item.summary ? `\n${item.summary}` : "";
  return `${item.title}${summary}`.trim();
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

export class NewsService {
  private readonly logger: Logger;
  private cached?: NewsSnapshot;
  private inFlight?: Promise<NewsSnapshot>;
  private readonly embeddingCache = new Map<string, number[]>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getLatest(): Promise<NewsSnapshot> {
    const now = Date.now();
    if (this.cached && now - this.cached.fetchedAt < CACHE_TTL_MS) {
      return this.cached;
    }

    if (this.inFlight) return this.inFlight;

    this.inFlight = this.fetchLatest()
      .then((snapshot) => {
        this.cached = snapshot;
        return snapshot;
      })
      .catch((error) => {
        this.logger.error("Failed to fetch news: %s", String(error));
        if (this.cached) return this.cached;
        throw error;
      })
      .finally(() => {
        this.inFlight = undefined;
      });

    return this.inFlight;
  }

  async getCategory(category: string): Promise<NewsItem[]> {
    const snapshot = await this.getLatest();
    return snapshot.categories.get(category) ?? [];
  }

  async search(query: string, llm: LlmClient): Promise<ScoredNewsItem[]> {
    const snapshot = await this.getLatest();
    const items = this.getUniqueItems(snapshot.items).filter((item) => item.title);
    if (items.length === 0) return [];

    const queryEmbedding = await llm.embed(query);
    const embeddings = await this.getEmbeddings(items, llm);

    const scored: ScoredNewsItem[] = [];
    for (const item of items) {
      const key = item.link ?? "";
      const embedding = key ? embeddings.get(key) : undefined;
      if (!embedding) continue;
      scored.push({
        ...item,
        score: cosineSimilarity(queryEmbedding, embedding)
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  private getUniqueItems(items: NewsItem[]): NewsItem[] {
    const unique = new Map<string, NewsItem>();
    for (const item of items) {
      const key = item.link ?? `${item.title}:${item.summary ?? ""}`;
      if (!unique.has(key)) unique.set(key, item);
    }
    return Array.from(unique.values());
  }

  private async getEmbeddings(
    items: NewsItem[],
    llm: LlmClient
  ): Promise<Map<string, number[]>> {
    const missing: { key: string; text: string }[] = [];
    for (const item of items) {
      const key = item.link;
      if (!key) continue;
      if (this.embeddingCache.has(key)) continue;
      const text = buildEmbeddingText(item);
      if (!text) continue;
      missing.push({ key, text });
    }

    if (missing.length > 0) {
      const embeddings = await llm.embedMany(missing.map((entry) => entry.text));
      embeddings.forEach((embedding, index) => {
        const entry = missing[index];
        if (entry) {
          this.embeddingCache.set(entry.key, embedding);
        }
      });
    }

    return this.embeddingCache;
  }

  private async fetchLatest(): Promise<NewsSnapshot> {
    const response = await fetch(NEWS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`News request failed with status ${response.status}`);
    }

    const raw = (await response.json()) as RawNewsResponse;
    const categories = new Map<string, NewsItem[]>();
    const items: NewsItem[] = [];

    for (const [category, value] of Object.entries(raw)) {
      if (!Array.isArray(value)) continue;
      const list: NewsItem[] = [];
      for (const entry of value as RawNewsItem[]) {
        if (!entry || typeof entry !== "object") continue;
        const title = toText(entry.title);
        if (!title) continue;
        const summary = toText(entry.summary);
        const image = toText(entry.image_link);
        const link = toText(entry.news_link);
        const item: NewsItem = {
          title,
          summary,
          image,
          link,
          category
        };
        list.push(item);
      }
      if (list.length > 0) {
        categories.set(category, list);
        items.push(...list);
      }
    }

    return { fetchedAt: Date.now(), items, categories };
  }
}
