import { ChainKey, Network } from "../blockchain"
import { LiquidityPoolEntity } from "../databases"

export interface IPool {
    quoteExactIn(
        params: QuoteExactInParams
    ): Promise<QuoteResult>

    quoteExactOut(
        params: QuoteExactOutParams
    ): Promise<QuoteResult>

    quote(
        params: QuoteParams
    ): Promise<QuoteResult>
}

export interface QuoteExactInParams {
    liquidityPool: LiquidityPoolEntity,
    chainKey: ChainKey,
    network: Network,
    amountIn: number,
    xForY: boolean,
}

export interface QuoteParams {
    liquidityPool: LiquidityPoolEntity,
    chainKey: ChainKey,
    network: Network,
    amountSpecified: number,
    xForY: boolean,
    exactIn?: boolean
}

export interface QuoteResult {
    amount: number
    estimatedGas: number
}

export interface QuoteExactOutParams {
    liquidityPool: LiquidityPoolEntity,
    chainKey: ChainKey,
    network: Network,
    amountOut: number,
    xForY: boolean,
}

export type TokenAddress = string
export const NATIVE = "native"