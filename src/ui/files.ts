/** Saves a file through the browser's download flow. */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari may still be reading the URL right after the click.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Whether the system share sheet can take a JSON file (mostly phones). */
export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File(['{}'], 'test.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
}

/**
 * Opens the share sheet, e.g. to save into iCloud Drive or send to a chat.
 * Must run directly from a click: browsers refuse without a fresh user gesture.
 */
export async function shareFile(file: File): Promise<'shared' | 'cancelled'> {
  try {
    await navigator.share({ files: [file], title: file.name });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
