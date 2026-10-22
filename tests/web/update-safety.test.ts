import { describe, expect, it, vi } from 'vitest';
import { installWithSavedDocuments } from '../../src/web/update-safety';

const document = () => ({ dirty: false, uncertain: false, checkpoint: vi.fn(), flush: vi.fn(async () => {}) });

describe('update document safety', () => {
  it.each(['dirty', 'uncertain'] as const)('rejects any %s document before recovery or installation', async field => {
    const first = document(), second = document(), install = vi.fn();
    second[field] = true;
    await expect(installWithSavedDocuments([first, second], install)).rejects.toThrow('Save all documents');
    expect(first.checkpoint).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  it('does not install when recovery cannot confirm a checkpoint', async () => {
    const tab = document(), install = vi.fn();
    tab.flush.mockRejectedValue(new Error('Recovery failed.'));
    await expect(installWithSavedDocuments([tab], install)).rejects.toThrow('Recovery failed.');
    expect(install).not.toHaveBeenCalled();
  });

  it('waits for every checkpoint before it starts installation', async () => {
    const order: string[] = [];
    const tabs = [1, 2].map(id => ({ dirty: false, uncertain: false,
      checkpoint: () => { order.push(`checkpoint ${id}`); },
      flush: async () => { await Promise.resolve(); order.push(`flush ${id}`); },
    }));
    await installWithSavedDocuments(tabs, async () => { order.push('install'); });
    expect(order).toEqual(['checkpoint 1', 'flush 1', 'checkpoint 2', 'flush 2', 'install']);
  });
});
