import { ChainKey, Network } from "../blockchain"
import { LiquidityPoolEntity } from "../databases"

export interface IPool {
    quote(
        params: QuoteParams
    ): Promise<number>
}

export interface QuoteParams {
    liquidityPool: LiquidityPoolEntity,
    chainKey: ChainKey,
    network: Network,
    amountIn: bigint,
    xForY: boolean,
}

export interface QuoteResult {
    amount: number
    estimatedGas: number
}