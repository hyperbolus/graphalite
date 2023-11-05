export class Annotation {
    element: HTMLElement = document.createElement('div');

    static overlay?: HTMLElement;
    mounted: boolean = false;

    x: number = 0;
    y: number = 0;

    constructor(x: number, y: number, content: string) {
        this.x = x;
        this.y = y;
        if (Annotation.overlay instanceof HTMLElement) {
            this.element.innerHTML = content;
            this.element.className = 'annotation';
            Annotation.overlay.appendChild(this.element);
            this.mounted = true;
        }
    }

    move(x: number, y: number) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
}