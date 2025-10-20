import type * as L from 'leaflet';

export interface LayerRenderer<TPayload> {
  init(map: L.Map): void;
  render(payload: TPayload): void;
  onViewChange(): void;
  clear(): void;
  destroy(): void;
}
