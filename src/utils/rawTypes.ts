export type FloatLiteral = `${number}.${number}`

export interface RawType<T> extends RawJSON {
    valueOf(): T
}

// 因为无法判断其他代码实现的接口是否真的是RawType，所以用Symbol来标记
// 只要不export，其他代码就无法访问这个Symbol， 确保了唯一性
const IS_RAW_SYMBOL = Symbol('isRawJSON')

export const f64 = (literal: FloatLiteral) => {
    // 判断是否可以转换为json原始值
    // 不可转换会SyntaxError
    const rawJSON = JSON.rawJSON(literal).rawJSON
    return {
        [IS_RAW_SYMBOL]: true,
        rawJSON,
        valueOf() {
            return parseFloat(literal)
        }
    }
}

export function isRawJSON(v: any) {
    return v?.[IS_RAW_SYMBOL] === true
}