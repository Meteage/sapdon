//import { Dimension, MolangVariableMap, system, world } from "@minecraft/server";

export class Matrix {
    /**
     * @remarks
     * 创建矩阵
     * @param {number} row 矩阵的行数
     * @param {number} column 矩阵的列数
     * @param {number} initialValue 填充矩阵的默认值
     * @param {Array} arr 二维的数组，函数会以该数组里的数据创建矩阵
     */
    constructor(row, column, initialValue = 0, arr = []) {
        this.row = row;
        this.column = column;
        this.matrix = [];
        for (let m = 0; m < row; m++) {
            const row_arr = [];
            for (let n = 0; n < column; n++) {
                row_arr.push(initialValue);
            }
            this.matrix.push(row_arr);
        }
        this.initialize(arr);
    }
    /**
     * @remarks 以该数组里的数据初始化矩阵
     * @param {Array} arr 二维的数组，函数会以该数组里的数据初始化矩阵
     */
    initialize(arr) {
        if (arr.length > this.row || arr[0].length > this.column) {
            throw new Error(`Matrix.initialize: 数组尺寸(${arr.length}x${arr[0].length})超出矩阵(${this.row}x${this.column})`);
        }
        arr.forEach((row, m) => {
            row.forEach((v, n) => {
                this.matrix[m][n] = v;
            })
        });
    }
    /**
     * @remarks 进行矩阵点乘
     * @param {Array} arr1 向量1
     * @param {Array} arr2 向量2
     * @returns 向量点乘结果
     */
    vectorDot(arr1, arr2) {
        return arr1.reduce((sum, value, i) => sum + value * arr2[i], 0);
    }
    /**
     * @remarks 矩阵右乘
     * @param {Matrix} matrix 右乘的矩阵
     * @returns 矩阵
     */
    multiply(matrix) {
        if (this.column != matrix.row) {
            throw new Error(`Matrix.multiply: 维度不匹配，左矩阵${this.row}x${this.column}，右矩阵${matrix.row}x${matrix.column}`);
        }
        const matrixT = matrix.transpose();
        const arr = this.matrix.map(A_row => matrixT.matrix.map(B_row => this.vectorDot(A_row, B_row)));
        return new Matrix(arr.length, arr[0].length, 0, arr);
    }
    /**
     * 
     * @returns 转置后的矩阵
     */
    transpose() {
        const arr = this.matrix[0].map((_, i) => this.matrix.map(row => row[i]));
        return new Matrix(this.column, this.row, 0, arr);
    }
    /**
     * 
     * @returns 矩阵数组
     */
    toArray() {
        return this.matrix;
    }
}


export class Transformation {
    /**
     * @remarks 将矩阵转换成齐次矩阵
     * @param {Array} coordinates 相对坐标组
     * @returns 齐次矩阵
     */
    static toHomogeneous(coordinates) {
        if (coordinates.length === 0) {
            throw new Error('toHomogeneous: 坐标组不能为空');
        }
        const arr = coordinates.map(coord => [...coord, 1]);
        return new Matrix(arr.length, arr[0].length, 0, arr);
    }

    /**
     * @remarks 按比例向量缩放
     * @param {Array} coordinates 相对坐标组[x,y,z]
     * @param {Array} scaleVector 缩放向量[scale_x,scale_y,scale_z]
     * @returns 按比例向量缩放后的相对坐标组
     */
    static scaleTransformation(coordinates, scaleVector) {
        const [sx, sy, sz] = scaleVector;
        const result = [];
        for (const p of coordinates) {
            result.push([p[0] * sx, p[1] * sy, p[2] * sz]);
        }
        return result;
    }

    /**
     * @remarks 获得缩放矩阵
     * @param {Array} scaleVector 缩放向量[scale_x,scale_y,scale_z]
     * @returns 缩放矩阵
     */
    static scaleMatrix(scaleVector) {
        const scaleArr = [
            [scaleVector[0], 0, 0, 0],
            [0, scaleVector[1], 0, 0],
            [0, 0, scaleVector[2], 0],
            [0, 0, 0, 1]
        ];
        return new Matrix(4, 4, 0, scaleArr);
    }

    /**
     * @remarks 获得绕x轴旋转的矩阵
     * @param {number} angle 旋转弧度
     * @returns 绕x轴旋转的矩阵
     */
    static xRotationMatrix(angle) {
        const rotationArr = [
            [1, 0, 0, 0],
            [0, Math.cos(angle), -Math.sin(angle), 0],
            [0, Math.sin(angle), Math.cos(angle), 0],
            [0, 0, 0, 1]
        ];
        return new Matrix(4, 4, 0, rotationArr);
    }

    /**
     * @remarks 获得绕y轴旋转的矩阵
     * @param {number} angle 旋转弧度
     * @returns 绕y轴旋转的矩阵
     */
    static yRotationMatrix(angle) {
        const rotationArr = [
            [Math.cos(angle), 0, Math.sin(angle), 0],
            [0, 1, 0, 0],
            [-Math.sin(angle), 0, Math.cos(angle), 0],
            [0, 0, 0, 1]
        ];
        return new Matrix(4, 4, 0, rotationArr);
    }

    /**
     * @remarks 获得绕z轴旋转的矩阵
     * @param {number} angle 旋转弧度
     * @returns 绕z轴旋转的矩阵
     */
    static zRotationMatrix(angle) {
        const rotationArr = [
            [Math.cos(angle), -Math.sin(angle), 0, 0],
            [Math.sin(angle), Math.cos(angle), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
        return new Matrix(4, 4, 0, rotationArr);
    }

    /**
     * @remarks 对相对坐标组进行旋转（直接向量公式，无矩阵分配）
     * @param {Array} coordinates 相对坐标组
     * @param {string} axis 旋转轴
     * @param {number} angle 旋转角度
     * @returns 进行旋转后的相对坐标组
     */
    static rotationTransformation(coordinates, axis, angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const result = [];
        switch (axis) {
            case 'x':
                for (const p of coordinates) {
                    result.push([p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]);
                }
                break;
            case 'y':
                for (const p of coordinates) {
                    result.push([p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]);
                }
                break;
            case 'z':
                for (const p of coordinates) {
                    result.push([p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]);
                }
                break;
            default:
                throw new Error("Invalid axis. Must be 'x', 'y', or 'z'.");
        }
        return result;
    }

    /**
     * @remarks 对相对坐标组进行平移变换
     * @param {Array} coordinates 相对坐标组
     * @param {Array} translationVector 平移向量
     * @returns 进行平移变换的相对坐标组
     */
    static translationTransformation(coordinates, translationVector) {
        const [tx, ty, tz] = translationVector;
        const result = [];
        for (const p of coordinates) {
            result.push([p[0] + tx, p[1] + ty, p[2] + tz]);
        }
        return result;
    }

    /**
     * @remarks 获得平移矩阵
     * @param {Array} translationVector 平移向量[x,y,z]
     * @returns 平移矩阵
     */
    static translationMatrix(translationVector) {
        const translationArr = [
            [1, 0, 0, translationVector[0]],
            [0, 1, 0, translationVector[1]],
            [0, 0, 1, translationVector[2]],
            [0, 0, 0, 1]
        ];
        return new Matrix(4, 4, 0, translationArr);
    }
}


export class Calculator {
    /**
     * @remarks 计算两个点之间线段的相对坐标
     * @param {Array} arr1 起始点的坐标数组[x,y,z]
     * @param {Array} arr2 终末点的坐标数组[x,y,z]
     * @param {number} d 计算间距
     * @returns 两个点之间线段的点的相对坐标组
     */
    static Line(arr1, arr2, d) {
        const arr = [];
        const vector = {
            x: arr2[0] - arr1[0],
            y: arr2[1] - arr1[1],
            z: arr2[2] - arr1[2]
        };
        const length = Math.hypot(vector.x, vector.y, vector.z);
        const dv = {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
        if (d <= 0) {
            throw new Error(`Calculator.Line: 采样间距 d 必须为正数，当前为 ${d}`);
        }
        const steps = Math.ceil(length / d);
        for (let k = 0; k <= steps; k++) {
            const t = Math.min(k * d, length);
            const point = [
                arr1[0] + dv.x * t,
                arr1[1] + dv.y * t,
                arr1[2] + dv.z * t
            ];
            arr.push(point);
        }
        return arr;
    }
    /**
     * @remarks 计算正方体的四个顶点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} edgeLength 正方体的边长
     * @returns 正方体的四个顶点的相对坐标组
     */
    static calculateCubeEdges(center, edgeLength) {
        const halfEdge = edgeLength / 2;
        const [x, y, z] = center;
        return [
            [x - halfEdge, y - halfEdge, z - halfEdge], // 0
            [x + halfEdge, y - halfEdge, z - halfEdge], // 1
            [x - halfEdge, y + halfEdge, z - halfEdge], // 2
            [x + halfEdge, y + halfEdge, z - halfEdge], // 3
            [x - halfEdge, y - halfEdge, z + halfEdge], // 4
            [x + halfEdge, y - halfEdge, z + halfEdge], // 5
            [x - halfEdge, y + halfEdge, z + halfEdge], // 6
            [x + halfEdge, y + halfEdge, z + halfEdge], // 7
        ];
    }
    /**
     * @remarks 计算正方体边缘点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} edgeLength 正方体的边长
     * @param {number} d 计算间距
     * @returns 正方体边缘点的相对坐标组
     */
    static calculateCubePoints(center, edgeLength, d) {
        const edges = Calculator.calculateCubeEdges(center, edgeLength);
        const edgePairs = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        const lines = edgePairs.flatMap(pair => {
            const start = edges[pair[0]];
            const end = edges[pair[1]];
            return Calculator.Line(start, end, d);
        });
        return edges.concat(lines);
    }
    /**
     * @remarks 计算圆边缘点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} r 半径
     * @param {number} da 计算精度
     * @returns 圆边缘点的相对坐标组
     */
    static calculateCirclePoints(center, r, da) {
        const arr = [];
        for (let a = 0; a < 2 * Math.PI; a += da) {
            const point = [
                center[0] + Math.cos(a) * r,
                center[1] + 0,
                center[2] + Math.sin(a) * r
            ];
            arr.push(point);
        }
        return arr;
    }
    /**
     * @remarks 计算n边形顶点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} n 顶点数
     * @param {number} r 半径
     * @returns 计算n边形顶点的相对坐标组
     */
    static calculatePolygonEdges(center, n, r) {
        const arr = [];
        let angle = 0;
        for (let i = 1; i <= n; i++) {
            //角度计算
            angle += 2 * Math.PI / n;
            const point = [
                center[0] + Math.cos(angle) * r,
                center[1] + 0,
                center[2] + Math.sin(angle) * r
            ];
            arr.push(point);
        }
        return arr;
    }
    /**
     * @remarks 计算n边形边缘点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} n 顶点数
     * @param {number} r 半径
     * @param {number} s 连接模式（连线步长：1 为逐边相连，>1 为星形多边形）
     * @param {number} d 计算精度
     * @returns  计算n边形边缘点的相对坐标组
     */
    static calculatePolygonPoints(center, n, r, s, d) {
        const edges = Calculator.calculatePolygonEdges(center, n, r);
        const Lines = edges.map((_, i) => {
            return Calculator.Line(edges[i], edges[(i + s) % n], d);
        });
        return edges.concat(Lines);
    }
    /**
     * @remarks 计算球体表面点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} r 半径
     * @param {number} da 纬度采样精度
     * @param {number} db 经度采样精度
     * @returns 球体表面点的相对坐标组
     */
    static calculateSpherePoints(center, r, da, db) {
        const arr = [];
        for (let a = 0; a < Math.PI; a += da) {
            for (let b = 0; b < 2 * Math.PI; b += db) {
                const point = [
                    center[0] + Math.sin(a) * Math.cos(b) * r,
                    center[1] + Math.cos(a) * r,
                    center[2] + Math.sin(a) * Math.sin(b) * r
                ];
                arr.push(point);
            }
        }
        return arr;
    }
    /**
     * @remarks 
     * 计算极坐标系下自定义图形的相对坐标
     * @param {Function} callback (t)={}
     * @param {Object} option {start:number,end:number,dt:number}
     * @returns 极坐标系下自定义图形的相对坐标组
     */
    static calculatePoints(callback, option) {
        let option_ = {
            start: 0,
            end: 1,
            dt: 0.1
        };
        option_ = Object.assign(option_, option);
        const arr = [];
        for (let t = option_.start; t < option_.end; t += option_.dt) {
            const point = callback.call(null, t);
            arr.push(point);
        }
        return arr;
    };
}

