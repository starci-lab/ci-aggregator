import { ChainKey, Network } from "../blockchain"

export const NATIVE = "native"
export type TokenAddress = typeof NATIVE | string
// Parameters required to generate a swap quote
export interface QuoteParams {
    fromToken: TokenAddress // The token address (or symbol) the user wants to swap from
    toToken: TokenAddress   // The token address (or symbol) the user wants to receive
    amountIn: string  // The input amount (in raw units, e.g. wei or smallest unit)
    userAddress?: string // (Optional) Address of the user requesting the quote
    slippage?: number     // (Optional) Acceptable slippage in percentage (e.g. 0.5 for 0.5%)
    deadline?: number     // (Optional) Unix timestamp when the quote expires
    maxHops?: number // (Optional) Maximum number of hops in the swap path, default is 2
    chainKey?: ChainKey // (Optional) Chain key, default is Monad
    network?: Network // (Optional) Network, default is Testnet
}

// Result returned by the quote function
export interface QuoteResult {
    amountOut: string     // Expected output amount after swap
    route: Array<string>       // List of token addresses used in the swap path
    estimatedGas?: number // (Optional) Estimated gas cost for the transaction
    priceImpact?: number  // (Optional) Estimated price impact in percentage
}

// Core interface for any swap engine or DEX implementation
export interface ICore {
    quote(params: QuoteParams): Promise<QuoteResult> // Returns a quote for a given swap
}