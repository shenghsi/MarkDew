import { EditorView } from '@codemirror/view';
import { tableCellField, tableComposing } from './table';

export function editGuard(view: EditorView): string | null {
  if (view.compositionStarted || tableComposing(view)) return 'Finish text input, then apply formatting.';
  if (view.state.readOnly) return 'The document is read-only.';
  if (view.state.field(tableCellField, false)) return 'End the table cell edit before you format document text.';
  if (view.state.selection.ranges.length !== 1) return 'Use one selection for formatting.';
  return null;
}
