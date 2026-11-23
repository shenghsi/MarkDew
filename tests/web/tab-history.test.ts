import { describe, expect, it } from 'vitest';
import { TabHistory } from '../../src/web/tab-history';

describe('TabHistory', () => {
  it('supports push, back, forward, and truncating forward history', () => {
    const history = new TabHistory();
    expect(history.canBack()).toBe(false);
    expect(history.canForward()).toBe(false);

    history.push(
      { path: '/a.md', scrollTop: 120, anchor: 10 },
      { path: '/b.md', scrollTop: 0, anchor: 0 },
    );
    expect(history.canBack()).toBe(true);
    expect(history.canForward()).toBe(false);
    expect(history.current()?.path).toBe('/b.md');

    history.push(
      { path: '/b.md', scrollTop: 240, anchor: 30 },
      { path: '/c.md', scrollTop: 0, anchor: 0 },
    );
    expect(history.current()?.path).toBe('/c.md');

    const prev = history.back(50, 5);
    expect(prev).toEqual({ path: '/b.md', scrollTop: 240, anchor: 30 });
    expect(history.canBack()).toBe(true);
    expect(history.canForward()).toBe(true);

    const first = history.back(240, 30);
    expect(first).toEqual({ path: '/a.md', scrollTop: 120, anchor: 10 });
    expect(history.canBack()).toBe(false);
    expect(history.canForward()).toBe(true);

    const next = history.forward(120, 10);
    expect(next).toEqual({ path: '/b.md', scrollTop: 240, anchor: 30 });

    // Pushing from the middle truncates '/c.md'
    history.push(
      { path: '/b.md', scrollTop: 300, anchor: 40 },
      { path: '/d.md', scrollTop: 0, anchor: 0 },
    );
    expect(history.canForward()).toBe(false);
    expect(history.current()?.path).toBe('/d.md');
    expect(history.back(0, 0)?.path).toBe('/b.md');
  });

  it('supports cross-tab return and forward restoration', () => {
    const targetHistory = new TabHistory();
    targetHistory.pushCrossTabReturn(
      { path: '/origin.md', scrollTop: 80, anchor: 12, returnTabId: 0 },
      { path: '/target.md', scrollTop: 0, anchor: 0 },
    );
    expect(targetHistory.canBack()).toBe(true);
    const backEntry = targetHistory.back(15, 3);
    expect(backEntry).toEqual({ path: '/origin.md', scrollTop: 80, anchor: 12, returnTabId: 0 });

    const originHistory = new TabHistory();
    originHistory.ensureForwardTo(
      { path: '/origin.md', scrollTop: 80, anchor: 12 },
      { path: '/target.md', scrollTop: 15, anchor: 3, returnTabId: 1 },
    );
    expect(originHistory.canForward()).toBe(true);
    expect(originHistory.forward(80, 12)).toEqual({
      path: '/target.md',
      scrollTop: 15,
      anchor: 3,
      returnTabId: 1,
    });
  });

  it('rolls back failed navigation cleanly', () => {
    const history = new TabHistory();
    history.push(
      { path: '/a.md', scrollTop: 0, anchor: 0 },
      { path: '/b.md', scrollTop: 0, anchor: 0 },
    );
    expect(history.back(10, 2)?.path).toBe('/a.md');
    history.rollback('back');
    expect(history.current()?.path).toBe('/b.md');
    expect(history.canBack()).toBe(true);
    expect(history.canForward()).toBe(false);
  });
});
