import type { RecoveryListing } from '../../src/web/recovery';
export function startupFixture(listing: RecoveryListing) {
  return { documents: [{ id: 0, path: '', baseline: '', uncertain: false }],
    sessions: [{ document: 0, session: listing.session, revision: listing.revision }], recovery: listing };
}
