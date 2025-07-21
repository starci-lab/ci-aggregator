import { ChainKey, Network } from "../blockchain"
import { LiquidityPoolEntity } from "../databases"

export interface IPool {
    quote(
        params: QuoteParams
    ): Promise<QuoteResult>
}

export interface QuoteParams {
    liquidityPool: LiquidityPoolEntity,
    chainKey: ChainKey,
    network: Network,
    amountIn: number,
    xForY: boolean,
}

export interface QuoteResult {
    amount: number
    estimatedGas: number
}

export type TokenAddress = string
export const NATIVE = "native"