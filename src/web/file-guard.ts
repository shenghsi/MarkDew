// File commands must wait until the edit surface finishes composition.
export const canUseFiles = (busy: boolean, composing: boolean) => !busy && !composing;
