interface RawJSON {
    rawJSON: string
}

interface JSON {
    /**
     * 不能在其中使用JSON对象和数组， 只允许传入数字、字符串、布尔值、null、undefined的字面量字符串
     */
    rawJSON(jsonValue: string): RawJSON
    isRawJSON(val: any): boolean
}