/* eslint-disable @typescript-eslint/no-explicit-any */
export enum RequestPatternMethod {
    Get = "GET",
    Post = "POST"
}

export interface RequestPattern {
    method: RequestPatternMethod
    params?: Record<string, any>      // Path params, e.g. { symbol: "BTCUSDT" }
    query?: Record<string, any>       // Query string, e.g. { limit: 1 }
    headers?: Record<string, any>     // Headers, e.g. { "X-API-KEY": "..." }
    body?: Record<string, any> | null // POST body
}

export enum PriceValueType {
    Raw = "raw",             // giữ nguyên kiểu string
    Number = "number",       // convert Number()
    BigInt = "bigint",       // convert BigInt()
}

export interface ResponsePattern {
    pricePath: Array<string>               // e.g. ["data", "price"]
    valueType?: PriceValueType        // "number" | "bigint" | "raw"
    unit?: string                     // USD, VND, etc.
}


export enum PoolTypeEnum {
    Amm = "amm", // constant product like Uniswap V2
    Clmm = "clmm", // concentrated liquidity like Uniswap V3
    Stable = "stable", // curve-style stable swap
}
  
export interface DexRequestPattern {
    method: string
    params?: Record<string, any>      // Path params, e.g. { symbol: "BTCUSDT" }
}
