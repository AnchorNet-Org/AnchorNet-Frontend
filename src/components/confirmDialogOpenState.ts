let openDialogCount = 0;

export function markConfirmDialogOpen(): void {
  openDialogCount += 1;
}

export function markConfirmDialogClosed(): void {
  openDialogCount = Math.max(0, openDialogCount - 1);
}

export function isConfirmDialogOpen(): boolean {
  return openDialogCount > 0;
}

export function resetConfirmDialogOpenState(): void {
  openDialogCount = 0;
}
