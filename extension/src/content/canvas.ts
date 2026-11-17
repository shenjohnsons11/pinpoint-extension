export interface CanvasRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export class FreehandDrawer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private onComplete: ((rect: CanvasRect) => void) | null = null;

  start(onComplete: (rect: CanvasRect) => void) {
    this.onComplete = onComplete;
    this.createCanvas();
  }

  private createCanvas() {
    this.cleanup();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pinpoint-draw-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '2147483646';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.pointerEvents = 'auto';

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 6]);
    }

    document.body.appendChild(this.canvas);

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseDown = (e: MouseEvent) => {
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing || !this.ctx || !this.canvas) return;
    this.currentX = e.clientX;
    this.currentY = e.clientY;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const w = this.currentX - this.startX;
    const h = this.currentY - this.startY;

    // Draw selection outline
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    this.ctx.fillRect(this.startX, this.startY, w, h);
    this.ctx.strokeRect(this.startX, this.startY, w, h);
  };

  private handleMouseUp = () => {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const minX = Math.min(this.startX, this.currentX);
    const minY = Math.min(this.startY, this.currentY);
    const width = Math.abs(this.currentX - this.startX);
    const height = Math.abs(this.currentY - this.startY);

    this.cleanup();

    // Ignore tiny accidental clicks
    if (width > 15 && height > 15 && this.onComplete) {
      this.onComplete({
        startX: minX,
        startY: minY,
        width,
        height,
      });
    }
  };

  cleanup() {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.remove();
      this.canvas = null;
    }
    this.isDrawing = false;
  }
}
