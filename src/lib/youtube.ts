const YOUTUBE_HOST_RE = /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i;

/** Extract YouTube video ID from common URL shapes, or return bare ID if valid. */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOST_RE.test(url.hostname)) return null;

  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;

  const parts = url.pathname.split("/").filter(Boolean);
  const embedIdx = parts.indexOf("embed");
  if (embedIdx >= 0 && parts[embedIdx + 1] && /^[\w-]{11}$/.test(parts[embedIdx + 1])) {
    return parts[embedIdx + 1];
  }

  const shortsIdx = parts.indexOf("shorts");
  if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[\w-]{11}$/.test(parts[shortsIdx + 1])) {
    return parts[shortsIdx + 1];
  }

  return null;
}

export function isValidYouTubeUrl(input: string): boolean {
  return parseYouTubeVideoId(input) !== null;
}

/** Canonical watch URL stored in DB. */
export function normalizeYouTubeUrl(input: string): string | null {
  const id = parseYouTubeVideoId(input);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function toYouTubeEmbedUrl(input: string): string | null {
  const id = parseYouTubeVideoId(input);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export interface ExerciseVideoLookup {
  name: string;
  catalogExerciseId?: string;
}

export interface CatalogExerciseVideo {
  id: string;
  name: string;
  youtubeUrl?: string | null;
  userId: string | null;
}

/** Resolve stored YouTube URL for a workout exercise (catalog ID, then owned name match). */
export function resolveExerciseVideoUrl(
  exercise: ExerciseVideoLookup,
  library: CatalogExerciseVideo[],
): string | null {
  if (exercise.catalogExerciseId) {
    const byId = library.find((e) => e.id === exercise.catalogExerciseId && e.youtubeUrl);
    if (byId?.youtubeUrl) return byId.youtubeUrl;
  }
  const byName = library.find(
    (e) => e.name === exercise.name && e.userId !== null && e.youtubeUrl,
  );
  return byName?.youtubeUrl ?? null;
}
