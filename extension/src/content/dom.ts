import { AnnotationNote } from '../../../shared/src/index';

export function getFileUrl(): string {
  return window.location.href;
}

// Convert absolute client coords to container percentage
export function toPercentageCoords(
  clientX: number,
  clientY: number,
  container: HTMLElement = document.body
): { xPercent: number; yPercent: number } {
  const rect = container.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth);
  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);

  const absX = clientX + scrollLeft;
  const absY = clientY + scrollTop;

  return {
    xPercent: (absX / docWidth) * 100,
    yPercent: (absY / docHeight) * 100,
  };
}

// Convert percentage to current page absolute pixels
export function fromPercentageCoords(
  xPercent: number,
  yPercent: number
): { x: number; y: number } {
  const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth);
  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);

  return {
    x: (xPercent / 100) * docWidth,
    y: (yPercent / 100) * docHeight,
  };
}

// Detect Google Sheets cell from mouse target or selection
export function findGoogleSheetCell(target: HTMLElement | null): { cellRef?: string; element?: HTMLElement } | null {
  if (!target) return null;

  // Google Sheets cell identifiers in DOM
  const cellEl = target.closest('[data-row][data-col]') as HTMLElement;
  if (cellEl) {
    const row = cellEl.getAttribute('data-row');
    const col = cellEl.getAttribute('data-col');
    if (row !== null && col !== null) {
      const colLetter = getColumnLetter(parseInt(col, 10));
      return {
        cellRef: `${colLetter}${parseInt(row, 10) + 1}`,
        element: cellEl,
      };
    }
  }

  // Fallback: check aria-label, gridcell role, or formula name box
  const nameBox = document.getElementById('t-name-box') as HTMLInputElement;
  if (nameBox && nameBox.value) {
    return { cellRef: nameBox.value };
  }

  return null;
}

function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}
