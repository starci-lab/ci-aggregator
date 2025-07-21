import { CurrencyAmount, Price, Token } from "@uniswap/sdk-core"
import invariant from "tiny-invariant"
import { FACTORY_ADDRESS } from "@uniswap/v3-sdk"
import { computePoolAddress } from "@uniswap/v3-sdk"
import { v3Swap } from "@uniswap/v3-sdk"
import { TickMath } from "@uniswap/v3-sdk"
import { Tick, TickConstructorArgs } from "@uniswap/v3-sdk"
import { TickDataProvider } from "@uniswap/v3-sdk"
import { TickListDataProvider } from "@uniswap/v3-sdk"
import JSBI from "jsbi"
import { NoTickDataProvider } from "@uniswap/v3-sdk"

export const NO_TICK_DATA_PROVIDER_DEFAULT = new NoTickDataProvider()
// constants used internally but not expected to be used externally
export const NEGATIVE_ONE = JSBI.BigInt(-1)
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)

// used in liquidity amount math
export const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))
export const Q192 = JSBI.exponentiate(Q96, JSBI.BigInt(2))
/**
 * By default, pools will not allow operations that require ticks.
 */

/**
 * Represents a V3 pool
 */
export class V3Pool {
    public readonly token0: Token
    public readonly token1: Token
    public readonly fee: number
    public readonly sqrtRatioX96: string
    public readonly liquidity: string
    public readonly tickSpacing: number
    public readonly tickCurrent: number
    public readonly tickDataProvider: TickDataProvider

    private _token0Price?: Price<Token, Token>
    private _token1Price?: Price<Token, Token>

    public static getAddress(
        tokenA: Token,
        tokenB: Token,
        fee: number,
        initCodeHashManualOverride?: string,
        factoryAddressOverride?: string,
    ): string {
        return computePoolAddress({
            factoryAddress: factoryAddressOverride ?? FACTORY_ADDRESS,
            fee,
            tokenA,
            tokenB,
            initCodeHashManualOverride,
        })
    }

    /**
   * Construct a pool
   * @param tokenA One of the tokens in the pool
   * @param tokenB The other token in the pool
   * @param fee The fee in hundredths of a bips of the input amount of every swap that is collected by the pool
   * @param sqrtRatioX96 The sqrt of the current ratio of amounts of token1 to token0
   * @param liquidity The current value of in range liquidity
   * @param tickCurrent The current tick of the pool
   * @param ticks The current state of the pool ticks or a data provider that can return tick data
   */
    public constructor(
        tokenA: Token,
        tokenB: Token,
        fee: number,
        tickSpacing: number,
        sqrtRatioX96: string,
        liquidity: string,
        tickCurrent: number,
        ticks:
      | TickDataProvider
      | (Tick | TickConstructorArgs)[] = NO_TICK_DATA_PROVIDER_DEFAULT,
    ) {
        invariant(Number.isInteger(fee) && fee < 1_000_000, "FEE")

        const tickCurrentSqrtRatioX96 = TickMath.getSqrtRatioAtTick(tickCurrent)
        const nextTickSqrtRatioX96 = TickMath.getSqrtRatioAtTick(tickCurrent + 1)
        invariant(
            JSBI.greaterThanOrEqual(
                JSBI.BigInt(sqrtRatioX96),
                tickCurrentSqrtRatioX96,
            ) &&
        JSBI.lessThanOrEqual(JSBI.BigInt(sqrtRatioX96), nextTickSqrtRatioX96),
            "PRICE_BOUNDS",
        );
        // always create a copy of the list since we want the pool's tick list to be immutable
        [this.token0, this.token1] = tokenA.sortsBefore(tokenB)
            ? [tokenA, tokenB]
            : [tokenB, tokenA]
        this.fee = fee
        this.tickSpacing = tickSpacing
        this.sqrtRatioX96 = sqrtRatioX96
        this.liquidity = liquidity
        this.tickCurrent = tickCurrent
        this.tickDataProvider = Array.isArray(ticks)
            ? new TickListDataProvider(ticks, tickSpacing)
            : ticks
    }

    /**
   * Returns true if the token is either token0 or token1
   * @param token The token to check
   * @returns True if token is either token0 or token
   */
    public involvesToken(token: Token): boolean {
        return token.equals(this.token0) || token.equals(this.token1)
    }

    /**
   * Returns the current mid price of the pool in terms of token0, i.e. the ratio of token1 over token0
   */
    public get token0Price(): Price<Token, Token> {
        return (
            this._token0Price ??
      (this._token0Price = new Price(
          this.token0,
          this.token1,
          Q192.toString(),
          JSBI.multiply(
              JSBI.BigInt(this.sqrtRatioX96),
              JSBI.BigInt(this.sqrtRatioX96),
          ).toString(),
      ))
        )
    }

    /**
   * Returns the current mid price of the pool in terms of token1, i.e. the ratio of token0 over token1
   */
    public get token1Price(): Price<Token, Token> {
        return (
            this._token1Price ??
      (this._token1Price = new Price(
          this.token1,
          this.token0,
          JSBI.multiply(
              JSBI.BigInt(this.sqrtRatioX96),
              JSBI.BigInt(this.sqrtRatioX96),
          ).toString(),
          Q192.toString(),
      ))
        )
    }

    /**
   * Return the price of the given token in terms of the other token in the pool.
   * @param token The token to return price of
   * @returns The price of the given token, in terms of the other.
   */
    public priceOf(token: Token): Price<Token, Token> {
        invariant(this.involvesToken(token), "TOKEN")
        return token.equals(this.token0) ? this.token0Price : this.token1Price
    }

    /**
   * Returns the chain ID of the tokens in the pool.
   */
    public get chainId(): number {
        return this.token0.chainId
    }

    /**
   * Given an input amount of a token, return the computed output amount, and a pool with state updated after the trade
   * @param inputAmount The input amount for which to quote the output amount
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit
   * @returns The output amount and the pool with updated state
   */
    public async getOutputAmount(
        inputAmount: CurrencyAmount<Token>,
        sqrtPriceLimitX96?: string,
    ): Promise<[CurrencyAmount<Token>, V3Pool]> {
        invariant(this.involvesToken(inputAmount.currency), "TOKEN")
        const zeroForOne = inputAmount.currency.equals(this.token0)
        const {
            amountCalculated: outputAmount,
            sqrtRatioX96,
            liquidity,
            tickCurrent,
        } = await this.swap(
            zeroForOne,
            inputAmount.quotient.toString(),
            sqrtPriceLimitX96,
        )
        const outputToken = zeroForOne ? this.token1 : this.token0
        return [
            CurrencyAmount.fromRawAmount(
                outputToken,
                JSBI.multiply(JSBI.BigInt(outputAmount), NEGATIVE_ONE).toString(),
            ),
            new V3Pool(
                this.token0,
                this.token1,
                this.fee,
                this.tickSpacing,
                sqrtRatioX96,
                liquidity,
                tickCurrent,
                this.tickDataProvider,
            ),
        ]
    }

    /**
   * Given a desired output amount of a token, return the computed input amount and a pool with state updated after the trade
   * @param outputAmount the output amount for which to quote the input amount
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @returns The input amount and the pool with updated state
   */
    public async getInputAmount(
        outputAmount: CurrencyAmount<Token>,
        sqrtPriceLimitX96?: string,
    ): Promise<[CurrencyAmount<Token>, V3Pool]> {
        invariant(
            outputAmount.currency.isToken &&
        this.involvesToken(outputAmount.currency),
            "TOKEN",
        )

        const zeroForOne = outputAmount.currency.equals(this.token1)

        const {
            amountCalculated: inputAmount,
            sqrtRatioX96,
            liquidity,
            tickCurrent,
        } = await this.swap(
            zeroForOne,
            JSBI.multiply(
                JSBI.BigInt(outputAmount.quotient.toString()),
                NEGATIVE_ONE,
            ).toString(),
            sqrtPriceLimitX96,
        )
        const inputToken = zeroForOne ? this.token0 : this.token1
        return [
            CurrencyAmount.fromRawAmount(inputToken, inputAmount),
            new V3Pool(
                this.token0,
                this.token1,
                this.fee,
                this.tickSpacing,
                sqrtRatioX96,
                liquidity,
                tickCurrent,
                this.tickDataProvider,
            ),
        ]
    }

    /**
   * Executes a swap
   * @param zeroForOne Whether the amount in is token0 or token1
   * @param amountSpecified The amount of the swap, which implicitly configures the swap as exact input (positive), or exact output (negative)
   * @param sqrtPriceLimitX96 The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @returns amountCalculated
   * @returns sqrtRatioX96
   * @returns liquidity
   * @returns tickCurrent
   */
    private async swap(
        zeroForOne: boolean,
        amountSpecified: string,
        sqrtPriceLimitX96?: string,
    ): Promise<{
    amountCalculated: string;
    sqrtRatioX96: string;
    liquidity: string;
    tickCurrent: number;
  }> {
        const result = await v3Swap(
            JSBI.BigInt(this.fee),
            JSBI.BigInt(this.sqrtRatioX96),
            this.tickCurrent,
            JSBI.BigInt(this.liquidity),
            this.tickSpacing,
            this.tickDataProvider,
            zeroForOne,
            JSBI.BigInt(amountSpecified),
            sqrtPriceLimitX96 ? JSBI.BigInt(sqrtPriceLimitX96) : undefined,
        )
        return {
            amountCalculated: result.amountCalculated.toString(),
            sqrtRatioX96: result.sqrtRatioX96.toString(),
            liquidity: result.liquidity.toString(),
            tickCurrent: result.tickCurrent,
        }
    }
}
