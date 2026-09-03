/**
 * Attach a failure handler to a data-loading promise.
 *
 * A rejected promise with no `.catch` becomes an unhandled rejection, which
 * React surfaces as a full-screen error overlay in dev — one failed panel takes
 * the whole page down. fetchApi already retries transport-level failures twice;
 * anything still failing by the time it reaches here is logged and swallowed so
 * the rest of the page keeps working.
 *
 * Use it around the whole chain, not just the request:
 *
 *     guard(api.getDistricts(id, slug).then(setDistricts), "districts");
 *
 * so that an error thrown inside the `.then` — a bad shape, a setState on an
 * unmounted tree — is caught too, not only the network call.
 */
export function guard<T>(p: Promise<T>, label: string): Promise<T | undefined> {
  return p.catch((err: unknown) => {
    console.warn(`[${label}] failed:`, err instanceof Error ? err.message : err);
    return undefined;
  });
}
