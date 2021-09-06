import { EventEmitter } from "events";
import { Map as LMap, DomUtil, LeafletMouseEvent } from "leaflet";
import { FeatureCollection, Panes, LatLng } from "../global";
import { booleanPointInPolygon, point as TPoint } from "@turf/turf";
import { getWindLevel, getFeatherCanvas } from "../utils/MarkSvg";
import getGridThinData from "../utils/getGridThinData";
interface Option {
  /**风向标颜色,默认黑色 */
  color?: string;
  /**风向标之间的最小间距,抽稀相关,默认[30,30] */
  interval?: [number, number];
  /**风向标大小-宽高,默认[30,30] ,修改后需重新setData*/
  size?: [number, number];
  /**是否进行抽稀,默认true,为数字时表示地图层级小于该数字时才抽稀 ,修改后需重新setData*/
  thinout?: boolean | number;
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement;
  className?: string;
  /**选择加入的地图层级，默认overlayPane */
  pane?: Panes;
  /**裁剪，需提供geoJson类型数组 */
  clip?: FeatureCollection | null;
  /**色斑图跟随地图移动类型,默认moveend更节省性能*/
  moveType?: "move" | "moveend";
}
interface SDItem extends LatLng {
  s: number;
  d: number;
  size?: [number, number]; //风向标大小-宽高
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
interface UVItem extends LatLng {
  u: number;
  v: number;
  /**风向标大小-宽高 */
  size?: [number, number];
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
export default class WindFeatherLayer2D extends EventEmitter {
  private map: LMap;
  private canvas: HTMLCanvasElement;
  private option: LayerOption;
  /**保存setData里的所有数据 */
  private totalData: UVItem[] | SDItem[] = [];
  private data: (UVItem & SDItem)[] = [];
  private windFeathers: Record<string, HTMLCanvasElement> = {};
  private isClear = true; //是否进行绘制
  private delay = false;
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    this.option = {
      size: [30, 30],
      interval: [50, 50],
      thinout: true,
      className: "",
      ...option,
    };
    this.canvas = document.createElement("canvas");
    this._init();
  }
  /**初始化 */
  private _init() {
    this._setZoom();
    this.map.on("click", this._mouseClick, this);
    this.canvas.style.animation = `gridanim 1s infinite`;
    this.canvas.className = `leaflet-zoom-animated ${
      this.option.className || ""
    }`;
    if (this.option.el) {
      this.option.el.appendChild(this.canvas);
    } else {
      this.map
        .getPanes()
        [this.option.pane || "shadowPane"].appendChild(this.canvas);
    }
  }
  private _mouseClick(e: LeafletMouseEvent) {
    const size = this.option.size as [number, number];
    const position = e.containerPoint;
    const feather = this.data.find((point) => {
      const pos = this.map.latLngToContainerPoint(point);
      return (
        position.x > pos.x &&
        position.x < pos.x + size[0] &&
        position.y > pos.y &&
        position.y < pos.y + size[1]
      );
    });
    this.emit("click", { value: feather, latlng: e.latlng, origin: e });
  }
  /**设置地图缩放偏移动画 */
  private _setZoom() {
    this.map.on("zoomanim", this._Transform, this);
    this.map.on(this.option.moveType || "moveend", this._DrawAble, this);
    return this;
  }
  /**地图缩放偏移动画 */
  private _Transform(e: L.ZoomAnimEvent) {
    const offset = e.target._latLngBoundsToNewLayerBounds(
      e.target.getBounds(),
      e.zoom,
      e.center
    ).min;
    const scale = e.target.getZoomScale(e.zoom);
    DomUtil.setTransform(this.canvas, offset, scale);
  }
  /**根据option和map状态配置canvas */
  private _CanvasConfig() {
    const bounds = this.map.getBounds();
    const point = this.map.latLngToLayerPoint(bounds.getNorthWest());
    this.canvas.style.transform = `translate(${point.x}px, ${point.y}px)`;
    this.canvas.width = this.map.getSize().x;
    this.canvas.height = this.map.getSize().y;
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.globalCompositeOperation = "source-over";
    context.save();
    return context;
  }

  private _DrawAble() {
    if (!this.isClear && !this.delay) {
      this.delay = true;
      setTimeout(() => {
        this.Draw();
        this.delay = false;
      }, 10);
    }
  }
  /**设置风向标数据 */
  setData(data: UVItem[] | SDItem[]): this {
    if (!this.option.thinout) {
      this.totalData = this._dataFormat(data);
      this.setClip(this.option.clip || null); //对data裁剪
    } else this.totalData = data;
    return this;
  }
  /**设置裁剪范围 */
  setClip(data: FeatureCollection | null = null): this {
    this.option.clip = data;
    if (this.option.clip === null) {
      return this;
    }
    this.data = this.data.filter((item) => {
      const point = TPoint([item.lng, item.lat]);
      if (this.option.clip) {
        return this.option.clip.features.some((feature) => {
          booleanPointInPolygon(point, feature);
        });
      }
      return true;
    });
    return this;
  }
  /**对风向标格点数据操作,计算各项属性 */
  private _dataFormat(data: UVItem[] | SDItem[]) {
    return (data as (UVItem | SDItem)[]).map((item: UVItem | SDItem) => {
      const size = item.size || (this.option.size as [number, number]);
      const velocityAbs = isFinite(item.s)
        ? item.s
        : Math.sqrt(Math.pow(item.u, 2) + Math.pow(item.v, 2));
      const velocityDir = isFinite(item.d)
        ? item.d
        : Math.atan2(item.u / velocityAbs, item.v / velocityAbs);
      const velocityDirToDegrees = (velocityDir * 180) / Math.PI + 180;
      const U = isFinite(item.u) ? item.u : Math.sin((item.d / 180) * Math.PI);
      const V = isFinite(item.v) ? item.v : Math.cos((item.d / 180) * Math.PI);
      const diagonal = Math.sqrt(size[1] ** 2 + size[0] ** 2); //对角线长
      const dX = Math.cos((Math.PI * 3) / 4 - velocityDir) * diagonal; //对角顶点X偏移
      const dY = -Math.sin((Math.PI * 3) / 4 - velocityDir) * diagonal; //对角顶点Y偏移
      const _offset = [size[0] / 2 - dX / 2, size[1] / 2 - dY / 2]; //计算旋转之后的中心点偏移
      return {
        ...item,
        u: U,
        v: V,
        s: velocityAbs,
        d: velocityDir,
        degree: velocityDirToDegrees,
        _offset,
      };
    });
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    this.setClip(this.option.clip || null);
    return this;
  }
  /**绘制 */
  Draw(): void {
    this._FilterData();
    this.isClear = false;
    const context = this._CanvasConfig();
    this._DrawFeather(context);
  }
  /**过滤节点 */
  private _FilterData(): this {
    if (this.option.thinout === false) return this;
    //范围过滤
    const bounds = this.map.getBounds();
    const p1 = this.map.containerPointToLatLng(
      this.option.interval || [30, 30]
    );
    const p2 = this.map.containerPointToLatLng([0, 0]);
    const xInterval = Math.abs(p1.lng - p2.lng);
    const yInterval = Math.abs(p1.lat - p2.lat);
    const border = {
      west: bounds.getSouthWest().lng - xInterval,
      east: bounds.getNorthEast().lng + xInterval,
      south: bounds.getSouthWest().lat - yInterval,
      north: bounds.getNorthEast().lat + yInterval,
    };
    const data = (this.totalData as LatLng[]).filter((point) => {
      return (
        point.lat > border.south &&
        point.lat < border.north &&
        point.lng > border.west &&
        point.lng < border.east
      );
    });
    //抽稀
    if (
      this.map.getZoom() < (this.option?.thinout || 0) ||
      this.option.thinout === true
    ) {
      const thinData: UVItem[] | SDItem[] = getGridThinData(data as UVItem[], [
        xInterval,
        yInterval,
      ]);
      this.setClip(this.option.clip || null); //裁剪
      this.data = this._dataFormat(thinData); //格式化
    }
    return this;
  }
  /**绘制风向标 */
  private _DrawFeather(context: CanvasRenderingContext2D) {
    context.beginPath();
    this.data.forEach((item) => {
      context.save();
      const position = this.map.latLngToContainerPoint(item);
      context.translate(
        position.x + item._offset[0],
        position.y + item._offset[1]
      );
      context.rotate(item.d + Math.PI);
      const level = getWindLevel(item.s);
      const color = item.color || this.option.color || "#000";
      const size = item.size || (this.option.size as [number, number]);
      const featherId = `${level}-${color}-${size.toString()}`;
      if (!this.windFeathers[featherId]) {
        this.windFeathers[featherId] = getFeatherCanvas(level, {
          size,
          color,
        });
      }
      const feather = this.windFeathers[featherId];
      context.drawImage(feather, 0, 0, feather.width, feather.height);
      context.restore();
    });
  }
  /**清除 */
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isClear = true;
    return this;
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off(this.option.moveType || "moveend", this._DrawAble, this);
    this.map.off("zoomanim", this._Transform, this);
    this.map.off("click", this._mouseClick, this);
    this.removeAllListeners();
    if (this.option.el) {
      this.option.el.removeChild(this.canvas);
    } else {
      this.map
        .getPanes()
        [this.option.pane || "shadowPane"]?.removeChild(this.canvas);
    }
    return this;
  }
}
