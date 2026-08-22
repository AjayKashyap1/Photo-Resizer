declare module 'bwip-js' {
  export function toCanvas(canvas: HTMLCanvasElement | string, options: any): HTMLCanvasElement;
  export function toSVG(options: any): string;
  export function loadFont(name: string, size: number, data: any): void;
  const bwipjs: {
    toCanvas: typeof toCanvas;
    toSVG: typeof toSVG;
    loadFont: typeof loadFont;
  };
  export default bwipjs;
}
