/*  Global class for simulating the movement of particle through a 1km wind grid
    credit: All the credit for this work goes to: https://github.com/cambecc for creating the repo:
      https://github.com/cambecc/earth. The majority of this code is directly take nfrom there, since its awesome.
    This class takes a canvas element and an array of data (1km GFS from http://www.emc.ncep.noaa.gov/index.php?branch=GFS)
    and then uses a mercator (forward/reverse) projection to correctly map wind vectors in "map space".
    The "start" method takes the bounds of the map at its current extent and starts the whole gridding,
    interpolation and animation process.
*/
interface Header {
  refTime: "2014-11-30T06:00:00.000Z";
  parameterCategory: number;
  parameterNumber: number;
  parameterNumberName: "U-component_of_wind" | "V-component_of_wind";
  forecastTime: 6;
  /**width */
  nx: number;
  /**height */
  ny: number;
  /**west */
  lo1: number;
  /**north */
  la1: number;
  /**lonStep */
  dx: number;
  /**latStep */
}
interface WindData {
  header: Header;
  data: number[];
}
interface Param {
  canvas: HTMLCanvasElement;
  data: [WindData, WindData];
}
export const Windy = function (params: Param) {
  const VELOCITY_SCALE = 0.011; // scale for wind velocity (completely arbitrary--this value looks nice)
  const INTENSITY_SCALE_STEP = 10; // step size of particle intensity color scale
  const MAX_WIND_INTENSITY = 40; // wind velocity at which particle intensity is maximum (m/s)
  const MAX_PARTICLE_AGE = 100; // max number of frames a particle is drawn before regeneration
  const PARTICLE_LINE_WIDTH = 2; // line width of a drawn particle
  const PARTICLE_MULTIPLIER = 1 / 30; // particle count scalar (completely arbitrary--this values looks nice)
  const PARTICLE_REDUCTION = 0.75; // reduce particle count to this much of normal for mobile devices
  const FRAME_RATE = 20; // desired milliseconds per frame

  const NULL_WIND_VECTOR = [NaN, NaN, null]; // singleton for no wind in the form: [u, v, magnitude]

  // interpolation for vectors like wind (u,v,m)
  const bilinearInterpolateVector = function (
    x: number,
    y: number,
    g00: number[],
    g10: number[],
    g01: number[],
    g11: number[]
  ) {
    const rx = 1 - x;
    const ry = 1 - y;
    const a = rx * ry,
      b = x * ry,
      c = rx * y,
      d = x * y;
    const u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
    const v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
    return [u, v, Math.sqrt(u * u + v * v)];
  };

  const createWindBuilder = function (uComp: WindData, vComp: WindData) {
    const uData = uComp.data,
      vData = vComp.data;
    return {
      header: uComp.header,
      data: function (i: number) {
        return [uData[i], vData[i]];
      },
      interpolate: bilinearInterpolateVector,
    };
  };

  const createBuilder = function (data: [WindData, WindData]) {
    let uComp: WindData | null = null;
    let vComp: WindData | null = null;

    data.forEach(function (record) {
      switch (
        record.header.parameterCategory +
        "," +
        record.header.parameterNumber
      ) {
        case "2,2":
          uComp = record;
          break;
        case "2,3":
          vComp = record;
          break;
        default:
      }
    });

    if (uComp && vComp) {
      return createWindBuilder(uComp, vComp);
    } else {
      return new Error(`lack of U-component_of_wind or V-component_of_wind`);
    }
  };

  const buildGrid = function (data, callback) {
    const builder = createBuilder(data);

    const header = builder.header;
    const λ0 = header.lo1,
      φ0 = header.la1; // the grid's origin (e.g., 0.0E, 90.0N)
    const Δλ = header.dx,
      Δφ = header.dy; // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)
    const ni = header.nx,
      nj = header.ny; // number of grid points W-E and N-S (e.g., 144 x 73)
    const date = new Date(header.refTime);
    date.setHours(date.getHours() + header.forecastTime);

    // Scan mode 0 assumed. Longitude increases from λ0, and latitude decreases from φ0.
    // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
    const grid = [],
      p = 0;
    const isContinuous = Math.floor(ni * Δλ) >= 360;
    for (const j = 0; j < nj; j++) {
      const row = [];
      for (const i = 0; i < ni; i++, p++) {
        row[i] = builder.data(p);
      }
      if (isContinuous) {
        // For wrapped grids, duplicate first column as last column to simplify interpolation logic
        row.push(row[0]);
      }
      grid[j] = row;
    }

    function interpolate(λ, φ) {
      const i = floorMod(λ - λ0, 360) / Δλ; // calculate longitude index in wrapped range [0, 360)
      const j = (φ0 - φ) / Δφ; // calculate latitude index in direction +90 to -90

      const fi = Math.floor(i),
        ci = fi + 1;
      const fj = Math.floor(j),
        cj = fj + 1;

      const row;
      if ((row = grid[fj])) {
        const g00 = row[fi];
        const g10 = row[ci];
        if (isValue(g00) && isValue(g10) && (row = grid[cj])) {
          const g01 = row[fi];
          const g11 = row[ci];
          if (isValue(g01) && isValue(g11)) {
            // All four points found, so interpolate the value.
            return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
          }
        }
      }
      return null;
    }
    callback({
      date: date,
      interpolate: interpolate,
    });
  };

  /**
   * @returns {Boolean} true if the specified value is not null and not undefined.
   */
  const isValue = function (x) {
    return x !== null && x !== undefined;
  };

  /**
   * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
   *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
   */
  const floorMod = function (a, n) {
    return a - n * Math.floor(a / n);
  };

  /**
   * @returns {Boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
   */
  const isMobile = function () {
    return /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(
      navigator.userAgent
    );
  };

  /**
   * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
   * vector is modified in place and returned by this function.
   */
  const distort = function (projection, λ, φ, x, y, scale, wind, windy) {
    const u = wind[0] * scale;
    const v = wind[1] * scale;
    const d = distortion(projection, λ, φ, x, y, windy);

    // Scale distortion vectors by u and v, then add.
    wind[0] = d[0] * u + d[2] * v;
    wind[1] = d[1] * u + d[3] * v;
    return wind;
  };

  const distortion = function (projection, λ, φ, x, y, windy) {
    const τ = 2 * Math.PI;
    const H = Math.pow(10, -5.2);
    const hλ = λ < 0 ? H : -H;
    const hφ = φ < 0 ? H : -H;

    const pλ = project(φ, λ + hλ, windy);
    const pφ = project(φ + hφ, λ, windy);

    // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1º λ
    // changes depending on φ. Without this, there is a pinching effect at the poles.
    const k = Math.cos((φ / 360) * τ);
    return [
      (pλ[0] - x) / hλ / k,
      (pλ[1] - y) / hλ / k,
      (pφ[0] - x) / hφ,
      (pφ[1] - y) / hφ,
    ];
  };

  const createField = function (columns, bounds, callback) {
    /**
     * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
     *          is undefined at that point.
     */
    function field(x, y) {
      const column = columns[Math.round(x)];
      return (column && column[Math.round(y)]) || NULL_WIND_VECTOR;
    }

    // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
    // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
    field.release = function () {
      columns = [];
    };

    field.randomize = function (o) {
      // UNDONE: this method is terrible
      const x, y;
      const safetyNet = 0;
      do {
        x = Math.round(Math.floor(Math.random() * bounds.width) + bounds.x);
        y = Math.round(Math.floor(Math.random() * bounds.height) + bounds.y);
      } while (field(x, y)[2] === null && safetyNet++ < 30);
      o.x = x;
      o.y = y;
      return o;
    };

    //field.overlay = mask.imageData;
    //return field;
    callback(bounds, field);
  };

  const buildBounds = function (bounds, width, height) {
    const upperLeft = bounds[0];
    const lowerRight = bounds[1];
    const x = Math.round(upperLeft[0]); //Math.max(Math.floor(upperLeft[0], 0), 0);
    const y = Math.max(Math.floor(upperLeft[1], 0), 0);
    const yMax = Math.min(Math.ceil(lowerRight[1], height), height - 1);
    return {
      x: x,
      y: y,
      xMax: width,
      yMax: yMax,
      width: width,
      height: height,
    };
  };

  const deg2rad = function (deg) {
    return (deg / 180) * Math.PI;
  };

  const rad2deg = function (ang) {
    return ang / (Math.PI / 180.0);
  };

  const invert = function (x, y, windy) {
    const mapLonDelta = windy.east - windy.west;
    const worldMapRadius =
      ((windy.width / rad2deg(mapLonDelta)) * 360) / (2 * Math.PI);
    const mapOffsetY =
      (worldMapRadius / 2) *
      Math.log((1 + Math.sin(windy.south)) / (1 - Math.sin(windy.south)));
    const equatorY = windy.height + mapOffsetY;
    const a = (equatorY - y) / worldMapRadius;

    const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(a)) - Math.PI / 2);
    const lon = rad2deg(windy.west) + (x / windy.width) * rad2deg(mapLonDelta);
    return [lon, lat];
  };

  const mercY = function (lat) {
    return Math.log(Math.tan(lat / 2 + Math.PI / 4));
  };

  const project = function (lat, lon, windy) {
    // both in radians, use deg2rad if neccessary
    const ymin = mercY(windy.south);
    const ymax = mercY(windy.north);
    const xFactor = windy.width / (windy.east - windy.west);
    const yFactor = windy.height / (ymax - ymin);

    const x = (deg2rad(lon) - windy.west) * xFactor;
    const y = (ymax - mercY(deg2rad(lat))) * yFactor; // y points south
    return [x, y];
  };

  const interpolateField = function (grid, bounds, extent, callback) {
    const projection = {};
    const velocityScale = VELOCITY_SCALE;

    const columns = [];
    const x = bounds.x;

    function interpolateColumn(x) {
      const column = [];
      for (const y = bounds.y; y <= bounds.yMax; y += 2) {
        const coord = invert(x, y, extent);
        if (coord) {
          const λ = coord[0],
            φ = coord[1];
          if (isFinite(λ)) {
            const wind = grid.interpolate(λ, φ);
            if (wind) {
              wind = distort(
                projection,
                λ,
                φ,
                x,
                y,
                velocityScale,
                wind,
                extent
              );
              column[y + 1] = column[y] = wind;
            }
          }
        }
      }
      columns[x + 1] = columns[x] = column;
    }

    (function batchInterpolate() {
      const start = Date.now();
      while (x < bounds.width) {
        interpolateColumn(x);
        x += 2;
        if (Date.now() - start > 1000) {
          //MAX_TASK_TIME) {
          setTimeout(batchInterpolate, 25);
          return;
        }
      }
      createField(columns, bounds, callback);
    })();
  };

  const animate = function (bounds, field) {
    function hexToR(h) {
      return parseInt(cutHex(h).substring(0, 2), 16);
    }
    function hexToG(h) {
      return parseInt(cutHex(h).substring(2, 4), 16);
    }
    function hexToB(h) {
      return parseInt(cutHex(h).substring(4, 6), 16);
    }
    function cutHex(h) {
      return h.charAt(0) == "#" ? h.substring(1, 7) : h;
    }

    function windIntensityColorScale(step, maxWind) {
      const result = [
        /* blue to red
          "rgba(" + hexToR('#178be7') + ", " + hexToG('#178be7') + ", " + hexToB('#178be7') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#8888bd') + ", " + hexToG('#8888bd') + ", " + hexToB('#8888bd') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#b28499') + ", " + hexToG('#b28499') + ", " + hexToB('#b28499') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#cc7e78') + ", " + hexToG('#cc7e78') + ", " + hexToB('#cc7e78') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#de765b') + ", " + hexToG('#de765b') + ", " + hexToB('#de765b') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#ec6c42') + ", " + hexToG('#ec6c42') + ", " + hexToB('#ec6c42') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#f55f2c') + ", " + hexToG('#f55f2c') + ", " + hexToB('#f55f2c') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#fb4f17') + ", " + hexToG('#fb4f17') + ", " + hexToB('#fb4f17') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#fe3705') + ", " + hexToG('#fe3705') + ", " + hexToB('#fe3705') + ", " + 0.5 + ")",
          "rgba(" + hexToR('#ff0000') + ", " + hexToG('#ff0000') + ", " + hexToB('#ff0000') + ", " + 0.5 + ")"
          */
        "rgba(" +
          hexToR("#00ffff") +
          ", " +
          hexToG("#00ffff") +
          ", " +
          hexToB("#00ffff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#64f0ff") +
          ", " +
          hexToG("#64f0ff") +
          ", " +
          hexToB("#64f0ff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#87e1ff") +
          ", " +
          hexToG("#87e1ff") +
          ", " +
          hexToB("#87e1ff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#a0d0ff") +
          ", " +
          hexToG("#a0d0ff") +
          ", " +
          hexToB("#a0d0ff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#b5c0ff") +
          ", " +
          hexToG("#b5c0ff") +
          ", " +
          hexToB("#b5c0ff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#c6adff") +
          ", " +
          hexToG("#c6adff") +
          ", " +
          hexToB("#c6adff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#d49bff") +
          ", " +
          hexToG("#d49bff") +
          ", " +
          hexToB("#d49bff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#e185ff") +
          ", " +
          hexToG("#e185ff") +
          ", " +
          hexToB("#e185ff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#ec6dff") +
          ", " +
          hexToG("#ec6dff") +
          ", " +
          hexToB("#ec6dff") +
          ", " +
          0.5 +
          ")",
        "rgba(" +
          hexToR("#ff1edb") +
          ", " +
          hexToG("#ff1edb") +
          ", " +
          hexToB("#ff1edb") +
          ", " +
          0.5 +
          ")",
      ];
      /*
        const result = [];
        for (const j = 225; j >= 100; j = j - step) {
          result.push(asColorStyle(j, j, j, 1));
        }
        */
      result.indexFor = function (m) {
        // map wind speed to a style
        return Math.floor(
          (Math.min(m, maxWind) / maxWind) * (result.length - 1)
        );
      };
      return result;
    }

    const colorStyles = windIntensityColorScale(
      INTENSITY_SCALE_STEP,
      MAX_WIND_INTENSITY
    );
    const buckets = colorStyles.map(function () {
      return [];
    });

    const particleCount = Math.round(
      bounds.width * bounds.height * PARTICLE_MULTIPLIER
    );
    if (isMobile()) {
      particleCount *= PARTICLE_REDUCTION;
    }

    const fadeFillStyle = "rgba(0, 0, 0, 0.97)";

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(
        field.randomize({
          age: Math.floor(Math.random() * MAX_PARTICLE_AGE) + 0,
        })
      );
    }

    function evolve() {
      buckets.forEach(function (bucket) {
        bucket.length = 0;
      });
      particles.forEach(function (particle) {
        if (particle.age > MAX_PARTICLE_AGE) {
          field.randomize(particle).age = 0;
        }
        const x = particle.x;
        const y = particle.y;
        const v = field(x, y); // vector at current position
        const m = v[2];
        if (m === null) {
          particle.age = MAX_PARTICLE_AGE; // particle has escaped the grid, never to return...
        } else {
          const xt = x + v[0];
          const yt = y + v[1];
          if (field(xt, yt)[2] !== null) {
            // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
            particle.xt = xt;
            particle.yt = yt;
            buckets[colorStyles.indexFor(m)].push(particle);
          } else {
            // Particle isn't visible, but it still moves through the field.
            particle.x = xt;
            particle.y = yt;
          }
        }
        particle.age += 1;
      });
    }

    const g = params.canvas.getContext("2d") as CanvasRenderingContext2D;
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = fadeFillStyle;

    function draw() {
      // Fade existing particle trails.
      const prev = g.globalCompositeOperation;
      g.globalCompositeOperation = "destination-in";
      g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      g.globalCompositeOperation = prev;

      // Draw new particle trails.
      buckets.forEach(function (bucket, i) {
        if (bucket.length > 0) {
          g.beginPath();
          g.strokeStyle = colorStyles[i];
          bucket.forEach(function (particle) {
            g.moveTo(particle.x, particle.y);
            g.lineTo(particle.xt, particle.yt);
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          g.stroke();
        }
      });
    }

    (function frame() {
      try {
        windy.timer = setTimeout(function () {
          requestAnimationFrame(frame);
          evolve();
          draw();
        }, 1000 / FRAME_RATE);
      } catch (e) {
        console.error(e);
      }
    })();
  };

  const start = function (bounds, width, height, extent) {
    const mapBounds = {
      south: deg2rad(extent[0][1]),
      north: deg2rad(extent[1][1]),
      east: deg2rad(extent[1][0]),
      west: deg2rad(extent[0][0]),
      width: width,
      height: height,
    };

    stop();

    // build grid
    buildGrid(params.data, function (grid) {
      // interpolateField
      interpolateField(
        grid,
        buildBounds(bounds, width, height),
        mapBounds,
        function (bounds, field) {
          // animate the canvas with random points
          windy.field = field;
          animate(bounds, field);
        }
      );
    });
  };

  const stop = function () {
    if (windy.field) windy.field.release();
    if (windy.timer) clearTimeout(windy.timer);
  };

  const windy = {
    params: params,
    start: start,
    stop: stop,
  };

  return windy;
};

// shim layer with setTimeout fallback
window.requestAnimationFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 20);
    }
  );
})();
