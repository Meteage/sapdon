// ============================================================
// 数学表达式 DSL（无 @minecraft 依赖，可 Node 单测）
// 语法参考 Java 模组 AnotherColorBlock /particleex <表达式>：
//   - 按 ';' 分隔的多条赋值语句：v = expr
//   - 支持 + - * / ^ % 与括号、一元负号、隐式乘（2PI, 3t, (a)(b)）
//   - 支持的函数见 FUNCTIONS
//   - 内置常量 PI / E / TAU；自变量 t / i / n；半径常量 r
//   - 输出：位置 x,y,z（必须）；逐粒子颜色 red,green,blue（可选）
// 实现为手写 tokenizer + 递归下降解析 + AST 求值，不依赖 eval。
// ============================================================

export interface MathContext {
    t: number; // 进度 0..1
    i: number; // 粒子序号
    n: number; // 粒子总数
    r: number; // 半径（radius 参数）
}

export interface EvalResult {
    x: number;
    y: number;
    z: number;
    red?: number;
    green?: number;
    blue?: number;
}

export class ExprError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ExprError";
    }
}

// ---------------- 常量 / 函数 ----------------

const CONSTANTS: Record<string, number> = {
    PI: Math.PI,
    E: Math.E,
    TAU: Math.PI * 2,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: (y, x) => Math.atan2(y, x),
    sqrt: Math.sqrt,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    exp: Math.exp,
    log: Math.log,
    ln: Math.log,
    pow: Math.pow,
    min: (...a) => Math.min(...a),
    max: (...a) => Math.max(...a),
    sign: Math.sign,
    mod: (a, b) => ((a % b) + b) % b,
    clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
    // 三角函数别名，便于兼容 mod 风格写法（接受与 sin/cos 等价的弧度）
    deg: (a) => (a * 180) / Math.PI,
    rad: (a) => (a * Math.PI) / 180,
};

// 禁止被赋值覆盖的内置输入/常量
const RESERVED_STORES = new Set(["t", "i", "n", "r", "PI", "E", "TAU"]);

// ---------------- Tokenizer ----------------

type TokenType = "number" | "ident" | "op" | "lparen" | "rparen" | "comma" | "semi" | "assign" | "eof";

interface Token {
    type: TokenType;
    value: string;
}

const OP_CHARS = new Set(["+", "-", "*", "/", "^", "%"]);

function tokenize(src: string): Token[] {
    const raw: Token[] = [];
    let j = 0;
    const len = src.length;
    while (j < len) {
        const ch = src[j];
        if (ch === " " || ch === "\t") { j++; continue; }
        if (ch === "(") { raw.push({ type: "lparen", value: ch }); j++; continue; }
        if (ch === ")") { raw.push({ type: "rparen", value: ch }); j++; continue; }
        if (ch === ",") { raw.push({ type: "comma", value: ch }); j++; continue; }
        if (ch === ";") { raw.push({ type: "semi", value: ch }); j++; continue; }
        if (ch === "=") { raw.push({ type: "assign", value: ch }); j++; continue; }
        if (OP_CHARS.has(ch)) { raw.push({ type: "op", value: ch }); j++; continue; }
        if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[j + 1] ?? ""))) {
            let k = j;
            while (k < len && /[0-9]/.test(src[k])) k++;
            if (src[k] === ".") { k++; while (k < len && /[0-9]/.test(src[k])) k++; }
            if ((src[k] === "e" || src[k] === "E")) {
                k++;
                if (src[k] === "+" || src[k] === "-") k++;
                while (k < len && /[0-9]/.test(src[k])) k++;
            }
            raw.push({ type: "number", value: src.slice(j, k) });
            j = k;
            continue;
        }
        if (/[a-zA-Z_]/.test(ch)) {
            let k = j;
            while (k < len && /[a-zA-Z0-9_]/.test(src[k])) k++;
            raw.push({ type: "ident", value: src.slice(j, k) });
            j = k;
            continue;
        }
        throw new ExprError(`无法识别字符 '${ch}'`);
    }
    raw.push({ type: "eof", value: "" });
    return insertImplicitMul(raw);
}

// 插入隐式乘号：2PI → 2*PI；3t → 3*t；2(x+1) → 2*(x+1)；(a)(b) → (a)*(b)；x2 → x*2
function insertImplicitMul(tokens: Token[]): Token[] {
    const out: Token[] = [];
    for (let k = 0; k < tokens.length; k++) {
        const cur = tokens[k];
        if (cur.type === "eof") { out.push(cur); break; }
        const prev = out.length ? out[out.length - 1] : null;
        if (prev && canEndOperand(prev) && canStartOperand(cur) && !isFunctionCall(prev, cur)) {
            out.push({ type: "op", value: "*" });
        }
        out.push(cur);
    }
    return out;
}

function canEndOperand(t: Token): boolean {
    return t.type === "number" || t.type === "ident" || t.type === "rparen";
}

function canStartOperand(t: Token): boolean {
    return t.type === "number" || t.type === "ident" || t.type === "lparen";
}

function isFunctionCall(prev: Token, cur: Token): boolean {
    if (prev.type !== "ident" || cur.type !== "lparen") return false;
    return Object.prototype.hasOwnProperty.call(FUNCTIONS, prev.value);
}

// ---------------- AST ----------------

type Node =
    | { kind: "num"; v: number }
    | { kind: "var"; name: string }
    | { kind: "fn"; name: string; args: Node[] }
    | { kind: "un"; op: string; a: Node }
    | { kind: "bin"; op: string; l: Node; r: Node };

// ---------------- Parser（递归下降） ----------------

class Parser {
    tokens: Token[];
    pos = 0;

    constructor(tokens: Token[]) { this.tokens = tokens; }

    peek(): Token { return this.tokens[this.pos]; }
    next(): Token { return this.tokens[this.pos++]; }
    expectOp(op: string): void {
        const t = this.peek();
        if (t.type !== "op" || t.value !== op) throw new ExprError(`期望运算符 '${op}'`);
        this.pos++;
    }

    parseExpr(): Node {
        let left = this.parseTerm();
        for (;;) {
            const t = this.peek();
            if (t.type === "op" && (t.value === "+" || t.value === "-")) {
                this.pos++;
                const right = this.parseTerm();
                left = { kind: "bin", op: t.value, l: left, r: right };
            } else {
                return left;
            }
        }
    }

    parseTerm(): Node {
        let left = this.parseFactor();
        for (;;) {
            const t = this.peek();
            if (t.type === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
                this.pos++;
                const right = this.parseFactor();
                left = { kind: "bin", op: t.value, l: left, r: right };
            } else {
                return left;
            }
        }
    }

    parseFactor(): Node {
        const t = this.peek();
        if (t.type === "op" && (t.value === "+" || t.value === "-")) {
            this.pos++;
            return { kind: "un", op: t.value, a: this.parseFactor() };
        }
        return this.parsePower();
    }

    parsePower(): Node {
        const base = this.parsePrimary();
        const t = this.peek();
        if (t.type === "op" && t.value === "^") {
            this.pos++;
            const exp = this.parseFactor(); // 右结合：x^2^3 = x^(2^3)
            return { kind: "bin", op: "^", l: base, r: exp };
        }
        return base;
    }

    parsePrimary(): Node {
        const t = this.next();
        if (t.type === "number") {
            const v = Number(t.value);
            if (isNaN(v)) throw new ExprError(`非法数字 '${t.value}'`);
            return { kind: "num", v };
        }
        if (t.type === "lparen") {
            const inner = this.parseExpr();
            this.expectRparen();
            return inner;
        }
        if (t.type === "ident") {
            const name = t.value;
            if (this.peek().type === "lparen") {
                this.pos++; // 跳过 '('
                if (!Object.prototype.hasOwnProperty.call(FUNCTIONS, name)) {
                    throw new ExprError(`未知函数 '${name}'`);
                }
                const args: Node[] = [];
                if (this.peek().type !== "rparen") {
                    args.push(this.parseExpr());
                    while (this.peek().type === "comma") { this.pos++; args.push(this.parseExpr()); }
                }
                this.expectRparen();
                return { kind: "fn", name, args };
            }
            return { kind: "var", name };
        }
        throw new ExprError(`非预期的记号 '${t.value}'`);
    }

    expectRparen(): void {
        if (this.peek().type !== "rparen") throw new ExprError("缺少右括号 ')'");
        this.pos++;
    }
}

// ---------------- 编译与求值 ----------------

interface Statement { target: string; root: Node; }

export class ProgramExpr {
    private stmts: Statement[] = [];
    private colorTargets = new Set<string>();

    constructor(program: string) {
        this.compile(program);
    }

    private compile(program: string): void {
        const tokens = tokenize(program);
        let p = 0;
        const n = tokens.length;
        while (p < n && tokens[p].type !== "eof") {
            // 形如： ident '=' expr ( ';' | eof )
            const targetTok = tokens[p];
            if (targetTok.type !== "ident") {
                if (targetTok.type === "semi") { p++; continue; } // 容忍多余分号
                throw new ExprError(`表达式应以 '变量名 = 公式' 形式书写，遇到 '${targetTok.value}'`);
            }
            const target = targetTok.value;
            if (RESERVED_STORES.has(target)) {
                throw new ExprError(`不能给内置量 '${target}' 赋值`);
            }
            if (tokens[p + 1]?.type !== "assign") {
                throw new ExprError(`应为 '${target} = …'，缺少赋值号`);
            }
            p += 2;
            const parser = new Parser(tokens.slice(p));
            const root = parser.parseExpr();
            p += parser.pos;
            // 跳到下一个 ';' 或 eof
            while (p < n && tokens[p].type !== "semi" && tokens[p].type !== "eof") {
                if (tokens[p].type !== "eof") p++;
            }
            if (p < n && tokens[p].type === "semi") p++;
            this.stmts.push({ target, root });
            if (target === "red" || target === "green" || target === "blue") {
                this.colorTargets.add(target);
            }
        }
        if (this.stmts.length === 0) {
            throw new ExprError("表达式为空，至少需要一条 'x=…;y=…;z=…'");
        }
    }

    hasColor(): boolean {
        return this.colorTargets.size > 0;
    }

    eval(ctx: MathContext): EvalResult {
        const env: Record<string, number> = {
            t: ctx.t,
            i: ctx.i,
            n: ctx.n,
            r: ctx.r,
        };
        for (const k of Object.keys(CONSTANTS)) env[k] = CONSTANTS[k];
        for (const st of this.stmts) {
            env[st.target] = evalNode(st.root, env);
        }
        const num = (v: number | undefined): number => (typeof v === "number" && isFinite(v) ? v : 0);
        const res: EvalResult = {
            x: num(env["x"]),
            y: num(env["y"]),
            z: num(env["z"]),
        };
        if (this.colorTargets.has("red")) res.red = num(env["red"]);
        if (this.colorTargets.has("green")) res.green = num(env["green"]);
        if (this.colorTargets.has("blue")) res.blue = num(env["blue"]);
        return res;
    }
}

function evalNode(node: Node, env: Record<string, number>): number {
    switch (node.kind) {
        case "num":
            return node.v;
        case "var": {
            const v = env[node.name];
            if (v === undefined) throw new ExprError(`未定义的变量 '${node.name}'`);
            return v;
        }
        case "un":
            return node.op === "-" ? -evalNode(node.a, env) : evalNode(node.a, env);
        case "fn": {
            const fn = FUNCTIONS[node.name];
            const args = node.args.map((a) => evalNode(a, env));
            return fn(...args);
        }
        case "bin": {
            const l = evalNode(node.l, env);
            const r = evalNode(node.r, env);
            switch (node.op) {
                case "+": return l + r;
                case "-": return l - r;
                case "*": return l * r;
                case "/": return r === 0 ? 0 : l / r;
                case "%": return r === 0 ? 0 : l % r;
                case "^": return Math.pow(l, r);
                default: throw new ExprError(`未知运算符 '${node.op}'`);
            }
        }
        default:
            throw new ExprError("未知 AST 节点");
    }
}

export function compileMath(program: string): ProgramExpr {
    return new ProgramExpr(program);
}