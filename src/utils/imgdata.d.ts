export interface Grid {
  data: Array<number>;
  size: [number, number];
  border: Border;
}

export interface Border {
  east: number;
  south: number;
  west: number;
  north: number;
}

export interface UV_Data {
  data: {
    u: Array<number>;
    v: Array<number>;
  };
  sLon: number; //东
  sLat: number; //南
  eLon: number; //西
  eLat: number; //北
  width: number;
  height: number;
  latStep: number;
  lonStep: number;
}
export interface PNGData {
  data: Array<number>;
  sLon: number; //东
  sLat: number; //南
  eLon: number; //西
  eLat: number; //北
  width: number;
  height: number;
  latStep: number;
  lonStep: number;
}
export function getJSONFromImg(url: string): Promise<PNGData>;
export function getJSONFromImg(url: string, isUV?: false): Promise<PNGData>;
export function getJSONFromImg(url: string, isUV?: true): Promise<UV_Data>;
