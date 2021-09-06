import { EventEmitter } from "events";
import { Map as LMap, DomUtil, LeafletMouseEvent } from "leaflet";
import { FeatureCollection, Panes, LatLng } from "../global";
import { bbox } from "@turf/turf";
import getGridThinData from "../utils/getGridThinData";
import {
  geoPath,
  GeoPermissibleObjects,
  geoTransform,
  line as d3Line,
} from "d3";
type PointType = "rect" | "circle";
interface Option {
  size?: [number, number]; //点-宽高,默认[30,30]
  color?: string | string[] | ((v?: number) => string); //点颜色,默认黑色
  /**裁剪类型，精细化裁剪或模糊裁剪,默认模糊*/
  clipType?: "fine" | "fuzzy";
  stroke?: boolean; //是否描边,默认false
  strokeWidth?: number; //描边宽,默认1
  strokeColor?: "auto" | string; //描边颜色,默认黑色
  value?: number[]; // 点值,对应图例颜色
  interval?: [number, number]; //点之间的最小间距,默认[30,30]
  thinout?: boolean; //是否进行抽稀,默认true
  type?: PointType; //描点类型'rect' | 'circle',默认circle;点类型等待后续加入
  fillText?: boolean; //是否绘制文字,取数组中value字段,默认true
  fontSize?: number; //文字大小,默认12
  fontColor?: "auto" | string; //文字颜色,默认auto
  format?: (v: number) => string; //对点每个值进行格式化操作
  img?: CanvasImageSource | ((v?: number) => CanvasImageSource); //自定义点形状,需要能被context.drawImage解析,不受该点size以外其他参数的影响
}
interface LayerOption extends Option {
  el?: HTMLElement; //是否挂载到单独的某个html元素上
  className?: string;
  pane?: Panes; //选择加入的地图层级,默认overlayPane
  clip?: FeatureCollection | null; //裁剪,需提供geoJson类型数组
  mousemove?: boolean; //是否开启mousemove监听(会在一定程度上造成性能损耗)默认false
  moveType?: "move" | "moveend";
}

interface Point extends LatLng {
  value?: number; //点的值,与color中的颜色对应
  color?: string;
  size?: number[]; //点-宽高,默认[30,30]//
  type?: PointType; //点类型
}
export default class SimplePoints extends EventEmitter {
  private map: LMap;
  private canvas: HTMLCanvasElement;
  private option: LayerOption;
  private totalData: Point[] = [];
  private data: Point[] = [];
  private delay = false; //mousemove事件延迟
  private canDraw = true;
  private clip = {
    //对clip内容进行缓存，提高性能
    canvas: document.createElement("canvas"),
    offset: [0, 0],
    scale: 1,
  };
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    this.option = { size: [30, 30], thinout: true, ...option };
    this.canvas = document.createElement("canvas");
    this._init();
  }
  /**初始化 */
  private _init() {
    this._setZoom();
    this.map.on("click", this._mouseClick, this);
    this.option.mousemove && this.map.on("mousemove", this._mouseMove, this);
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
    this.option.clip && this.setClip(this.option.clip);
  }
  private _mouseClick(e: LeafletMouseEvent) {
    const SIZE = this.option.size as [number, number];
    const position = e.containerPoint;
    const index = this.data.findIndex((point) => {
      const pos = this.map.latLngToContainerPoint(point);
      const size = point.size || SIZE;
      return (
        position.x > pos.x - size[0] / 2 &&
        position.x < pos.x + size[0] / 2 &&
        position.y > pos.y - size[1] / 2 &&
        position.y < pos.y + size[1] / 2
      );
    });
    this.emit("click", {
      target: this.data[index],
      latlng: e.latlng,
      origin: e,
      data: this.data,
      i: index,
    });
  }
  private _mouseMove(e: LeafletMouseEvent) {
    if (!this.delay) {
      const SIZE = this.option.size as [number, number];
      const position = e.containerPoint;
      const index = this.data.findIndex((point) => {
        const pos = this.map.latLngToContainerPoint(point);
        const size = point.size || SIZE;
        return (
          position.x > pos.x - size[0] / 2 &&
          position.x < pos.x + size[0] / 2 &&
          position.y > pos.y - size[1] / 2 &&
          position.y < pos.y + size[1] / 2
        );
      });
      this.emit("mousemove", {
        target: this.data[index],
        latlng: e.latlng,
        origin: e,
        data: this.data,
        i: index,
      });
      this.delay = true;
      setTimeout(() => (this.delay = false), 10);
    }
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
    this.clip.scale *= scale;
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
    context.font = `${this.option.fontSize || 12}px`;
    context.strokeStyle = this.option.strokeColor || "#000";
    context.lineWidth = this.option.strokeWidth || 1;
    context.save();
    return context;
  }
  /**获取颜色 */
  private getColor(value?: number) {
    const color = this.option.color;
    if (typeof color === "object") {
      if (value === undefined || !this.option.value) return color[0];
      const index = this.option.value.findIndex((val) => val > value);
      return color[index] || "#000";
    } else if (typeof color === "function") {
      return color(value);
    }
    return color || "#000";
  }

  private _FilterData(): this {
    if (this.option.thinout === false) {
      this.data = this.totalData;
      return this;
    }
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
    const data = this.totalData.filter((point) => {
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
      this.data = getGridThinData(data, [xInterval, yInterval]);
    }
    return this;
  }
  /**绘制点 */
  private _DrawPoints(context: CanvasRenderingContext2D) {
    const points = this.data;
    const size = this.option.size as [number, number];

    const fontSize = this.option.fontSize || 12;

    points.forEach((item: Point) => {
      context.save();
      context.beginPath();
      const position = this.map.latLngToContainerPoint(item);
      const text =
        item.value === undefined
          ? ""
          : this.option.format
          ? this.option.format(item.value)
          : item.value.toFixed(0);
      const measure = context.measureText(text);

      if (!this.option.img) {
        const SIZE = item.size ? item.size : size;
        context.translate(position.x - SIZE[0] / 2, position.y - SIZE[1] / 2);
        const color = item.color || this.getColor(item.value || 0);
        const type = item.type || this.option.type || "circle";
        if (type === "rect") {
          context.fillStyle = color;
          context.fillRect(0, 0, SIZE[0], SIZE[1]);
          this.option.stroke && context.stroke();
        } else if (type === "circle") {
          context.fillStyle = color;
          context.arc(SIZE[0] / 2, SIZE[0] / 2, SIZE[0] / 2, 0, Math.PI * 2);
          context.fill();
          this.option.stroke && context.stroke();
        }
        if (this.option.fillText !== false) {
          if (this.option.fontColor && this.option.fontColor != "auto")
            context.fillStyle = this.option.fontColor;
          context.fillText(
            text,
            SIZE[0] / 2 - measure.actualBoundingBoxRight / 2,
            SIZE[1] + fontSize
          );
        }
      } else {
        const img =
          typeof this.option.img === "function"
            ? this.option.img(item.value)
            : this.option.img;
        item.size = item.size
          ? item.size
          : [Number(img.width), Number(img.height)];
        context.translate(
          position.x - item.size[0] / 2,
          position.y - item.size[1] / 2
        );
        context.drawImage(img, 0, 0, item.size[0], item.size[1]);
        if (this.option.fillText !== false) {
          context.fillStyle = this.option.fontColor || "#000";
          context.fillText(
            text,
            item.size[0] / 2 - measure.actualBoundingBoxRight / 2,
            item.size[1] + fontSize
          );
        }
      }
      context.restore();
    });
  }
  private _DrawAble() {
    if (this.canDraw) {
      this.Draw();
    }
  }
  /**设置点数据 */
  setData(data: Point[]): this {
    this.totalData = data;
    return this;
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    this.setClip(this.option.clip || null);
    return this;
  }
  /**绘制 */
  Draw(): void {
    this.canDraw = true;
    const context = this._CanvasConfig();
    this._FilterData();
    this._DrawPoints(context);
    if (this.option.clip) {
      context.globalCompositeOperation = "destination-in";
      if (this.option.clipType === "fine") {
        this._setFineClip(context);
      } else {
        const img = this.clip.canvas;
        const scale = this.clip.scale;
        const offset = this.map.latLngToContainerPoint({
          lat: this.clip.offset[1],
          lng: this.clip.offset[0],
        });
        context.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          offset.x,
          offset.y,
          img.width * scale,
          img.height * scale
        );
      }
    }
  }
  /**清除 */
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canDraw = false;
    return this;
  }
  /**设置裁剪范围 */
  setClip(data: FeatureCollection | null): this {
    this.option.clip = data;
    if (this.option.clip === null || this.option.clipType === "fine") {
      return this;
    }
    const canvas = this.clip.canvas;
    const border = bbox(data);
    this.clip.offset = [border[0], border[3]];
    const northEast = this.map.latLngToContainerPoint({
      lat: border[3],
      lng: border[2],
    });
    const southWest = this.map.latLngToContainerPoint({
      lat: border[1],
      lng: border[0],
    });
    canvas.width = northEast.x - southWest.x;
    canvas.height = southWest.y - northEast.y;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.translate(-southWest.x, -northEast.y);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _self = this;
    const transfrom = geoTransform({
      point: function (x, y) {
        const point = _self.map.latLngToContainerPoint({
          lat: y,
          lng: x,
        });
        return this.stream.point(point.x, point.y);
      },
    });
    const path = geoPath(transfrom, context);
    this.option.clip.features.forEach(
      (feature: { geometry: GeoPermissibleObjects }) => {
        context.beginPath();
        path(feature.geometry);
        context.fillStyle = "#000";
        context.fill();
      }
    );
    return this;
  }
  /**精细化裁剪 */
  private _setFineClip(context: CanvasRenderingContext2D) {
    const transformPoint = (d: number[]) =>
      this.map.latLngToContainerPoint({
        lat: d[1],
        lng: d[0],
      });
    const path = d3Line()
      .x((d) => transformPoint(d).x)
      .y((d) => transformPoint(d).y)
      .context(context);
    this.option.clip?.features.forEach((feature) => {
      feature.geometry.coordinates.forEach((surface) => {
        surface.forEach((points) => {
          path(points as [number, number][]);
        });
      });
      context.fill();
    });
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off(this.option.moveType || "moveend", this._DrawAble, this);
    this.map.off("zoomanim", this._Transform, this);
    this.map.off("click", this._mouseClick, this);
    this.option.mousemove && this.map.off("mousemove", this._mouseMove, this);
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
