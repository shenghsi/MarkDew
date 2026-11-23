export interface TabHistoryEntry {
  path: string;
  fragment?: string;
  scrollTop: number;
  anchor: number;
  topPos?: number;
  topOffset?: number;
  // When set, navigating to this entry prefers switching back to that tab if it is still open.
  returnTabId?: number;
}

export interface HistoryPosition {
  scrollTop: number;
  anchor: number;
  topPos?: number;
  topOffset?: number;
}

const MAX_HISTORY_ENTRIES = 100;

export class TabHistory {
  private entries: TabHistoryEntry[] = [];
  private index = -1;

  get length(): number {
    return this.entries.length;
  }

  current(): TabHistoryEntry | undefined {
    return this.index >= 0 ? this.entries[this.index] : undefined;
  }

  canBack(): boolean {
    return this.index > 0;
  }

  canForward(): boolean {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }

  seed(entry: TabHistoryEntry): void {
    if (this.entries.length === 0) {
      this.entries.push({ ...entry });
      this.index = 0;
    }
  }

  push(fromCurrent: TabHistoryEntry, next: TabHistoryEntry): void {
    if (this.entries.length === 0) {
      this.entries.push({ ...fromCurrent }, { ...next });
      this.index = 1;
      return;
    }
    this.entries[this.index] = {
      ...this.entries[this.index],
      path: fromCurrent.path,
      scrollTop: fromCurrent.scrollTop,
      anchor: fromCurrent.anchor,
      topPos: fromCurrent.topPos,
      topOffset: fromCurrent.topOffset,
    };
    this.entries.length = this.index + 1;
    this.entries.push({ ...next });
    this.index = this.entries.length - 1;
    this.trim();
  }

  // Record a cross-tab arrival so pressing Back returns to the origin tab.
  pushCrossTabReturn(origin: TabHistoryEntry, current: TabHistoryEntry): void {
    if (this.entries.length === 0) {
      this.entries.push({ ...origin }, { ...current });
      this.index = 1;
      return;
    }
    this.entries.length = this.index + 1;
    const prev = this.entries[this.index];
    if (prev.returnTabId !== origin.returnTabId || prev.path !== origin.path) {
      this.entries.push({ ...origin });
    } else {
      this.entries[this.index] = { ...origin };
    }
    this.entries.push({ ...current });
    this.index = this.entries.length - 1;
    this.trim();
  }

  // When Back switches from another tab into this tab, ensure Forward can return there.
  ensureForwardTo(currentSnapshot: TabHistoryEntry, target: TabHistoryEntry): void {
    if (this.entries.length === 0) {
      this.entries.push({ ...currentSnapshot }, { ...target });
      this.index = 0;
      return;
    }
    this.entries[this.index] = {
      ...this.entries[this.index],
      scrollTop: currentSnapshot.scrollTop,
      anchor: currentSnapshot.anchor,
      topPos: currentSnapshot.topPos,
      topOffset: currentSnapshot.topOffset,
    };
    const next = this.entries[this.index + 1];
    if (!next || next.returnTabId !== target.returnTabId || next.path !== target.path) {
      this.entries.length = this.index + 1;
      this.entries.push({ ...target });
    }
  }

  back(currentScroll: number, currentAnchor: number, topPos?: number, topOffset?: number): TabHistoryEntry | undefined {
    if (!this.canBack()) return undefined;
    this.entries[this.index] = {
      ...this.entries[this.index],
      scrollTop: currentScroll,
      anchor: currentAnchor,
      topPos,
      topOffset,
    };
    this.index -= 1;
    return { ...this.entries[this.index] };
  }

  forward(currentScroll: number, currentAnchor: number, topPos?: number, topOffset?: number): TabHistoryEntry | undefined {
    if (!this.canForward()) return undefined;
    this.entries[this.index] = {
      ...this.entries[this.index],
      scrollTop: currentScroll,
      anchor: currentAnchor,
      topPos,
      topOffset,
    };
    this.index += 1;
    return { ...this.entries[this.index] };
  }

  rollback(direction: 'back' | 'forward'): void {
    if (direction === 'back' && this.index < this.entries.length - 1) {
      this.index += 1;
    } else if (direction === 'forward' && this.index > 0) {
      this.index -= 1;
    }
  }

  private trim(): void {
    if (this.entries.length <= MAX_HISTORY_ENTRIES) return;
    const drop = this.entries.length - MAX_HISTORY_ENTRIES;
    this.entries.splice(0, drop);
    this.index = Math.max(0, this.index - drop);
  }
}
