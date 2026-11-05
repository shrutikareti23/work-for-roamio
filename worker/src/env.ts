/**
 * Everything the Worker receives from Cloudflare: plain config vars now,
 * and later KV namespaces and secrets (added in Phase 4).
 */
export interface Env {
  APP_VERSION: string;
}
