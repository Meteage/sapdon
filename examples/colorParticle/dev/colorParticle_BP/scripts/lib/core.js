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
            console.log('the Array not meet requit!');
            return;
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
            console.log('Matrix dimensions do not match for multiplication');
            return;
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
        const coordMatrix = this.toHomogeneous(coordinates).transpose();
        const scaleMatrix = this.scaleMatrix(scaleVector);
        return scaleMatrix.multiply(coordMatrix).transpose().toArray();
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
     * @remarks 对相对坐标组进行旋转
     * @param {Array} coordinates 相对坐标组
     * @param {string} axis 旋转轴
     * @param {number} angle 旋转角度
     * @returns 进行旋转后的相对坐标组
     */
    static rotationTransformation(coordinates, axis, angle) {
        const coordMatrix = this.toHomogeneous(coordinates).transpose();
        let rotationMatrix;
        switch (axis) {
            case 'x':
                rotationMatrix = this.xRotationMatrix(angle);
                break;
            case 'y':
                rotationMatrix = this.yRotationMatrix(angle);
                break;
            case 'z':
                rotationMatrix = this.zRotationMatrix(angle);
                break;
            default:
                throw new Error("Invalid axis. Must be 'x', 'y', or 'z'.");
        }
        return rotationMatrix.multiply(coordMatrix).transpose().toArray();
    }

    /**
     * @remarks 对相对坐标组进行平移变换
     * @param {Array} coordinates 相对坐标组
     * @param {Array} translationVector 平移向量
     * @returns 进行平移变换的相对坐标组
     */
    static translationTransformation(coordinates, translationVector) {
        const coordMatrix = this.toHomogeneous(coordinates).transpose();
        const translationMatrix = this.translationMatrix(translationVector);
        return translationMatrix.multiply(coordMatrix).transpose().toArray();
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
        for (let i = 0; i < length; i += d) {
            const point = [
                arr1[0] + dv.x * i,
                arr1[1] + dv.y * i,
                arr1[2] + dv.z * i
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
     * @param {number} da 计算精度
     * @returns 圆边缘点的相对坐标组
     */
    static calculateCirclePoints(center, da) {
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
    static calculatePoygonEdges(center, n, r) {
        const arr = [];
        let angle = 0;
        for (let i = 1; i <= n; i++) {
            //角度计算
            angle += 2 * Math.PI / n;
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
     * @remarks 计算n边形边缘点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} n 顶点数
     * @param {number} r 半径
     * @param {number} s 连接模式
     * @param {number} d 计算精度
     * @returns  计算n边形边缘点的相对坐标组
     */
    static calculatePoygonPoints(center, n, r, s, d) {
        const edges = Calculator.calculatePoygonEdges(center, n, r);
        const Lines = edges.map((_, i) => {
            return Calculator.Line(edges[i], edges[(i + s) % n], d);
        });
        return edges.concat(edges);
    }
    /**
     * @remarks 计算球体边缘点的相对坐标
     * @param {Array} center 中心点的相对坐标数组[x,y,z]
     * @param {number} r 半径
     * @param {number} da 计算精度
     * @param {number} db 计算精度
     * @returns 球体边缘点的相对坐标组
     */
    static calculateSpherePoints(center, r, da, db) {
        const arr = [];
        for (let a = 0; a < 2 * Math.PI; a += da) {
            for (let b = 0; b < 2 * Math.PI; b += db) {
                const point = [
                    center[0] + Math.cos(a) * r,
                    center[1] + 0,
                    center[2] + Math.sin(a) * r
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
     * @param {Object} option {strat:number,end:number,d:number}
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

