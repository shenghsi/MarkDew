// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { recoveryPanel } from '../../src/web/recovery';

describe('recoveryPanel discard operations', () => {
  it('renders discard buttons and handles individual and bulk discard', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);

    let entries = [
      { id: 'rec-1', label: 'README.md', bytes: 1200 },
      { id: 'rec-2', label: 'Notes.md', bytes: 400 },
    ];

    const load = vi.fn().mockImplementation(async () => ({
      session: 'active-session',
      revision: 1,
      entries: [...entries],
      warnings: [],
    }));

    const restore = vi.fn().mockResolvedValue(undefined);
    const retry = vi.fn().mockResolvedValue(undefined);
    const discard = vi.fn().mockImplementation(async (id: string) => {
      entries = entries.filter(e => e.id !== id);
    });
    const clearAll = vi.fn().mockImplementation(async () => {
      entries = [];
    });

    const panel = recoveryPanel(parent, load, restore, retry, discard, clearAll);
    await panel.show();

    const panelElement = document.querySelector<HTMLElement>('.recovery-panel')!;
    expect(panelElement).toBeTruthy();
    expect(panelElement.hidden).toBe(false);

    const rows = panelElement.querySelectorAll('.recovery-row');
    expect(rows.length).toBe(2);

    const discardButtons = panelElement.querySelectorAll<HTMLButtonElement>('.recovery-row button[aria-label^="Discard "]');
    expect(discardButtons.length).toBe(2);

    const clearAllButton = Array.from(panelElement.querySelectorAll<HTMLButtonElement>('button')).find(
      b => b.textContent === 'Clear all copies'
    );
    expect(clearAllButton).toBeTruthy();
    expect(clearAllButton!.hidden).toBe(false);

    // Discard single entry
    discardButtons[0].click();
    await vi.waitFor(() => expect(discard).toHaveBeenCalledWith('rec-1'));
    await vi.waitFor(() => expect(panelElement.querySelectorAll('.recovery-row').length).toBe(1));

    // Clear all entries
    clearAllButton!.click();
    await vi.waitFor(() => expect(clearAll).toHaveBeenCalled());
    await vi.waitFor(() => expect(panelElement.querySelectorAll('.recovery-row').length).toBe(0));
    expect(panelElement.hidden).toBe(true);

    panelElement.remove();
    parent.remove();
  });
});
