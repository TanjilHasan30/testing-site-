import fs from 'node:fs';
import path from 'node:path';
import { createInitialSeed, type DatabaseState } from './seed.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let cachedDb: DatabaseState | null = null;
const messageRateWindow = new Map<string, number[]>();

function hydrateMissingCollections(existing: Partial<DatabaseState>): DatabaseState {
  const seed = createInitialSeed();
  const seedPostsById = new Map(seed.posts.map((p) => [p.id, p]));
  const mergedProducts =
    Array.isArray(existing.products) && existing.products.length >= seed.products.length
      ? existing.products
      : seed.products;
  const mergedDoctors =
    Array.isArray(existing.doctors) && existing.doctors.length >= seed.doctors.length
      ? existing.doctors
      : seed.doctors;

  const existingPosts = Array.isArray(existing.posts) ? existing.posts : [];
  const upgradedExistingPosts = existingPosts.map((p) => {
    const seedMatch = seedPostsById.get(p.id);
    if (
      seedMatch &&
      seedMatch.isVideo &&
      (!p.mediaUrls?.[0] || (!p.mediaUrls[0].endsWith('.mp4') && !p.mediaUrls[0].startsWith('/uploads/')))
    ) {
      return {
        ...p,
        mediaUrls: seedMatch.mediaUrls,
        videoDemoMode: seedMatch.videoDemoMode,
      };
    }
    return p;
  });
  const existingPostIds = new Set(upgradedExistingPosts.map((p) => p.id));
  const missingSeedPosts = seed.posts.filter((p) => !existingPostIds.has(p.id));
  const mergedPosts = [...upgradedExistingPosts, ...missingSeedPosts];

  const seedGuidesById = new Map(seed.guides.map((g) => [g.id, g]));
  const existingGuides = (Array.isArray(existing.guides) ? existing.guides : []).map((g) => {
    const seedMatch = seedGuidesById.get(g.id);
    return seedMatch && !g.topicKey ? { ...g, topicKey: seedMatch.topicKey } : g;
  });
  const existingGuideIds = new Set(existingGuides.map((g) => g.id));
  const missingSeedGuides = seed.guides.filter((g) => !existingGuideIds.has(g.id));
  const mergedGuides = [...existingGuides, ...missingSeedGuides];

  const existingBabies = Array.isArray(existing.babies) && existing.babies.length > 0 ? existing.babies : seed.babies;
  const mergedBabies = existingBabies.map((b, idx) => ({
    ...b,
    reminders: Array.isArray(b.reminders) ? b.reminders : seed.babies[idx]?.reminders ?? [],
  }));

  return {
    ...seed,
    ...existing,
    posts: mergedPosts,
    guides: mergedGuides,
    babies: mergedBabies,
    products: mergedProducts,
    doctors: mergedDoctors,
    brands: existing.brands && existing.brands.length > 0 ? existing.brands : seed.brands,
    categories: existing.categories && existing.categories.length > 0 ? existing.categories : seed.categories,
    coupons: existing.coupons && existing.coupons.length > 0 ? existing.coupons : seed.coupons,
    campaigns: existing.campaigns && existing.campaigns.length > 0 ? existing.campaigns : seed.campaigns,
    supportTickets: existing.supportTickets ?? seed.supportTickets,
    newsletterSubscribers: existing.newsletterSubscribers ?? seed.newsletterSubscribers,
    settings: existing.settings ?? seed.settings,
  };
}

export function getDb(): DatabaseState {
  if (cachedDb) return cachedDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      cachedDb = hydrateMissingCollections(parsed);
      return cachedDb;
    }
  } catch (err) {
    console.error('Failed to read local db.json, re-seeding:', err);
  }
  cachedDb = createInitialSeed();
  saveDb(cachedDb);
  return cachedDb;
}

export function saveDb(nextDb: DatabaseState): void {
  cachedDb = nextDb;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(nextDb, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist db.json:', err);
  }
}

export function checkMessageRateLimit(userId: string, maxPerMinute = 15): boolean {
  const now = Date.now();
  const recent = (messageRateWindow.get(userId) ?? []).filter((ts) => now - ts < 60_000);
  if (recent.length >= maxPerMinute) {
    return false;
  }
  recent.push(now);
  messageRateWindow.set(userId, recent);
  return true;
}
