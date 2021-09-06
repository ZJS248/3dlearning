const PNGUtil = {
  /**
    
     *  解析图片成对象
    
     */
  getGridInfo: function (ctxt, img, isUV = false) {
    var conf = this.getConf(ctxt);
    var hL = conf[0];
    var hLen = conf[1];
    var info = this.getHeader(ctxt, hL, img, hLen);
    info["headerLine"] = hL;
    if (isUV) {
      info["data"] = this.getGridUVData(ctxt, hL, img, info);
    } else {
      info["data"] = this.getGridData(ctxt, hL, img, info);
    }
    return info;
  },

  getConf: function (ctxt) {
    var pointInfo = ctxt.getImageData(0, 0, 1, 1).data;
    return [pointInfo[0], pointInfo[1] + pointInfo[2] * 255];
  },

  getGridData: function (ctxt, hL, img, info) {
    //缩放比
    var scaleFactor = info["scaleFactor"];
    scaleFactor = scaleFactor == undefined ? 1 : scaleFactor;
    //偏移量
    var addOffset = info["addOffset"];
    addOffset = addOffset == undefined ? 0 : addOffset;
    //宽度
    var width = img.width;
    //高度
    var height = img.height;
    var arr = [];
    var grids = ctxt.getImageData(0, hL, width, height - hL).data;
    for (var i = hL; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var curIndex = ((i - hL) * width + j) * 4;
        // arr.push((grids[curIndex] + (grids[curIndex + 1] << 8) + (grids[curIndex + 2] << 16)) / scaleFactor - addOffset);
        arr.push(
          (grids[curIndex] +
            grids[curIndex + 1] * 255 +
            grids[curIndex + 2] * 65025) /
            scaleFactor -
            addOffset
        );
      }
    }
    return arr;
  },

  getGridUVData: function (ctxt, hL, img, info) {
    //缩放比
    var scaleFactor = info["scaleFactor"];
    scaleFactor = scaleFactor == undefined ? 1 : scaleFactor;
    //偏移量
    var addOffset = info["addOffset"];
    addOffset = addOffset == undefined ? 0 : addOffset;
    //宽度
    var width = img.width;
    //高度
    var height = img.height;
    var arr = {
      u: [],
      v: [],
    };
    var grids = ctxt.getImageData(0, hL, width, height - hL).data;
    // for (var i =height-1 ; i >=hL; i--) {

    for (var i = hL; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var curIndex = ((i - hL) * width + j) * 4;
        arr.u.push(grids[curIndex] / scaleFactor - addOffset);
        arr.v.push(grids[curIndex + 1] / scaleFactor - addOffset);
      }
    }
    return arr;
  },

  getHeader: function (ctxt, hL, img, hLen) {
    var width = img.width;
    var headerStr = "";
    var hData = ctxt.getImageData(0, 0, width, hL).data;
    var w = parseInt(hLen / 3) + (hLen % 3 == 0 ? 0 : 1) + 1;
    for (var i = 1; i < w; i++) {
      var sub = hLen - 3 * (i - 1);
      if (sub < 3) {
        for (var j = 0; j <= sub; j++) {
          headerStr += this.getChar(hData[4 * i + j]);
        }
      } else {
        headerStr +=
          this.getChar(hData[4 * i]) +
          this.getChar(hData[4 * i + 1]) +
          this.getChar(hData[4 * i + 2]);
      }
    }
    return JSON.parse(decodeURIComponent(atob(headerStr)));
  },

  getChar: function (index) {
    return index == 255 ? "" : this.charIndex[index];
  },

  charIndex: {
    0: "A",

    1: "B",

    2: "C",

    3: "D",

    4: "E",

    5: "F",

    6: "G",

    7: "H",

    8: "I",

    9: "J",

    10: "K",

    11: "L",

    12: "M",

    13: "N",

    14: "O",

    15: "P",

    16: "Q",

    17: "R",

    18: "S",

    19: "T",

    20: "U",

    21: "V",

    22: "W",

    23: "X",

    24: "Y",

    25: "Z",

    26: "a",

    27: "b",

    28: "c",

    29: "d",

    30: "e",

    31: "f",

    32: "g",

    33: "h",

    34: "i",

    35: "j",

    36: "k",

    37: "l",

    38: "m",

    39: "n",

    40: "o",

    41: "p",

    42: "q",

    43: "r",

    44: "s",

    45: "t",

    46: "u",

    47: "v",

    48: "w",

    49: "x",

    50: "y",

    51: "z",

    52: "0",

    53: "1",

    54: "2",

    55: "3",

    56: "4",

    57: "5",

    58: "6",

    59: "7",

    60: "8",

    61: "9",

    62: "+",

    63: "/",

    64: "=",
  },
};

export const getJSONFromImg = function (url, isUV = false) {
  return new Promise((resolve) => {
    let img = new Image();
    img.src = url;
    img.onload = () => {
      let canvas = document.createElement("canvas");

      canvas.width = img.width;

      canvas.height = img.height;

      let ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      var gridDataInfo = PNGUtil.getGridInfo(ctx, img, isUV);
      resolve(gridDataInfo);
    };
  });
};
