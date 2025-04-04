import http from 'http';

if (!Symbol.metadata) {
    //@ts-ignore
    Symbol.metadata = Symbol('[[metadata]]');
}

// 因为无法判断其他代码实现的接口是否真的是RawType，所以用Symbol来标记
// 只要不export，其他代码就无法访问这个Symbol， 确保了唯一性
const IS_RAW_SYMBOL = Symbol('isRawJSON');
function isRawJSON(v) {
    return v?.[IS_RAW_SYMBOL] === true;
}

const rawTypes = [
    'string', 'boolean', 'number', 'undefined'
];
function jsonEncoderReplacer(_, v) {
    if (typeof v === null) {
        return null;
    }
    if (rawTypes.includes(typeof v)) {
        return JSON.rawJSON(v);
    }
    if (typeof v === 'object') {
        if (JSON.isRawJSON(v)) {
            return v;
        }
        if (isRawJSON(v)) {
            // 字符串再包装一遍
            return JSON.rawJSON(v.rawJSON);
        }
        return v;
    }
    if (typeof v === 'bigint') {
        return JSON.rawJSON(v.toString());
    }
    throw new Error('Unexpected value');
}
const jsonEncodeDecoder = {
    encode(value) {
        return JSON.stringify(value, jsonEncoderReplacer);
    },
    decode: JSON.parse
};
function encode(value, encodeDecoder = jsonEncodeDecoder) {
    return encodeDecoder.encode(value);
}
function decode(value, encodeDecoder = jsonEncodeDecoder) {
    return encodeDecoder.decode(value);
}

const devServerConfig = {
    port: 49037
};

const {
    port: port$1
} = devServerConfig;

async function cliRequest(path, ...params) {
    try {
        await fetch(`http://localhost:${port$1}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: encode(params)
        });
    } catch (error) {
        console.error(error);
        console.error('尝试在构建脚本中使用 server.startDevServer() 启动开发服务器');
    }
}

const { port } = devServerConfig;
class DevelopmentServer {
    cliServerHandlers = new Map();
    listening = false;
    isListening() {
        return this.listening;
    }
    bootstrap() {
        this.listening = true;
        const svr = http.createServer(async (req, res) => {
            const handler = this.cliServerHandlers.get((req.url ?? '/').slice(1));
            if (handler) {
                try {
                    const { promise, resolve, reject } = Promise.withResolvers();
                    let buf = Buffer.alloc(0);
                    req.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                    req.on('end', () => {
                        try {
                            resolve(decode(buf));
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    await handler(...await promise);
                }
                catch (error) {
                    console.error(error);
                    res.writeHead(500);
                    res.end();
                    return;
                }
                res.writeHead(200);
                res.end();
            }
            else {
                res.writeHead(404);
                res.end();
            }
        }).listen(port, () => console.log(`Dev Server listening on port ${port}`));
        svr.on('error', () => this.listening = false);
        return svr;
    }
    handle(url, handler) {
        this.cliServerHandlers.set(url, handler);
    }
    getHandler(url) {
        return this.cliServerHandlers.get(url);
    }
    interceptHandler(url, interceptor) {
        const currentHandler = this.getHandler(url) ?? Function.prototype;
        const newHandler = interceptor(currentHandler);
        this.cliServerHandlers.set(url, newHandler);
        return newHandler;
    }
}
const server = new DevelopmentServer();

const client = {
    call: async (name, ...args) => {
        return await cliRequest(name, ...args)
    }
};

export { client, server as devServer };
