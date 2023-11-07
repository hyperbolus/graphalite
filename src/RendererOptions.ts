export interface RendererOptions {
    canvas: HTMLElement | null,
    overlay?: HTMLElement | null,
    container: HTMLElement | null,
    logging?: 'none' | 'errors' | 'warnings' | 'info' | 'verbose',
    devTools?: boolean,
    debug?: boolean,
}