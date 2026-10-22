import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history, undo, redo } from '@codemirror/commands';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

describe('source record and CodeMirror history', () => {
  it('retains the BOM and mixed line endings through edits, undo and redo', () => {
    const original = '\uFEFFa\r\n😀b\rc\nd';
    let state = EditorState.create({ doc: normalize(fromSource(original).raw), extensions: [history(), sourceExtensions(fromSource(original))] });
    const target = { get state() { return state; }, dispatch(transaction: any) { state = transaction.state; } };
    const source = () => savedSource(state.field(sourceField));
    state = state.update({ changes: [{ from: 2, to: 4, insert: '日本\n' }, { from: 8, insert: '!' }] }).state;
    expect(source()).toBe('\uFEFFa\r\n日本\r\nb\rc\n!d');
    expect(undo(target)).toBe(true); expect(source()).toBe(original);
    expect(redo(target)).toBe(true); expect(source()).toBe('\uFEFFa\r\n日本\r\nb\rc\n!d');
    expect(normalize(state.field(sourceField).raw)).toBe(state.doc.toString());
  });
  it('restores consecutive changes one at a time', () => {
    let state = EditorState.create({ doc: 'a\nb', extensions: [history(), sourceExtensions(fromSource('a\rb'))] });
    const target = { get state() { return state; }, dispatch(transaction: any) { state = transaction.state; } };
    state = state.update({ changes: { from: 1, insert: '\n' }, userEvent: 'input.type' }).state;
    state = state.update({ changes: { from: 2, insert: 'x' }, userEvent: 'input.type' }).state;
    undo(target); expect(savedSource(state.field(sourceField))).toBe('a\r\rb');
    undo(target); expect(savedSource(state.field(sourceField))).toBe('a\rb');
    redo(target); redo(target); expect(savedSource(state.field(sourceField))).toBe('a\rx\rb');
  });
});
