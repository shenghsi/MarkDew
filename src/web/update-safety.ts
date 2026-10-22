export interface UpdateDocument {
  dirty: boolean;
  uncertain: boolean;
  checkpoint(): void;
  flush(): Promise<void>;
}

// Call with editor input locked. Check the whole set before disk work, then
// wait for every acknowledged recovery checkpoint before an installer can exit.
export async function installWithSavedDocuments(documents: readonly UpdateDocument[], install: () => Promise<void>): Promise<void> {
  if (documents.some(document => document.dirty || document.uncertain)) {
    throw new Error('Save all documents and check any uncertain Save before you install the update.');
  }
  for (const document of documents) { document.checkpoint(); await document.flush(); }
  await install();
}
