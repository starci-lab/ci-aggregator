import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Cache } from "cache-manager"
import { ethers } from "ethers"
import {
    blockchainRpc,
    ChainKey,
    Network,
    clmmAbi,
} from "@/modules/blockchain"
import {
    LiquidityPoolEntity,
    PoolTypeEnum,
    MemDbService,
} from "@/modules/databases"
import { WeightedRoundRobinService } from "@/modules/balancer"
import { UpstreamList } from "balancer-round-robin"
import { Sha256Service } from "@/modules/cryptography"
import { Cron } from "@nestjs/schedule"
import { QuoteParams, QuoteResult, IPool } from "../core.interface"
import { MulticallProvider } from "@ethers-ext/provider-multicall"
import { TickDataProvider } from "@uniswap/v3-sdk"
import { CurrencyAmount, Token } from "@uniswap/sdk-core"
import { computeFeeTierRaw, computeRaw } from "@/modules/common"
import { V3Pool } from "./v3-pool"

@Injectable()
export class ClmmService
implements IPool, OnModuleInit, OnApplicationBootstrap
{
    private readonly logger = new Logger(ClmmService.name)
    private wrrMap: Partial<
    Record<ChainKey, Partial<Record<Network, UpstreamList>>>
  > = {}

    constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly sha256Service: Sha256Service,
    private readonly wrrService: WeightedRoundRobinService,
    private readonly memDbService: MemDbService,
    ) {
        for (const chainKey of Object.values(ChainKey)) {
            this.wrrMap[chainKey] = {}
            for (const network of Object.values(Network)) {
                const list = blockchainRpc[chainKey]?.[network] || []
        this.wrrMap[chainKey]![network] = this.wrrService.createInstance({
            list,
        })
            }
        }
    }

    async onApplicationBootstrap() {
        // test quote
        const { amount } = await this.quote({
            amountIn: 1,
            chainKey: ChainKey.Monad,
            liquidityPool: this.memDbService.liquidityPools.find(
                (pool) =>
                    pool.poolType === PoolTypeEnum.Clmm &&
          pool.chainKey === ChainKey.Monad &&
          pool.network === Network.Testnet,
            )!,
            network: Network.Testnet,
            xForY: true,
        })
        console.log(amount)
    }

    async onModuleInit() {
        await this.updateClmmState()
    }

  @Cron("*/3 * * * * *")
    async updateClmmState() {
        const clmmPools = this.memDbService.liquidityPools.filter(
            (pool) => pool.poolType === PoolTypeEnum.Clmm,
        )
        for (const pool of clmmPools) {
            await this.queryClmmState({
                liquidityPool: pool,
                chainKey: pool.chainKey,
                network: pool.network,
            })
        }

        this.logger.verbose("Updated CLMM state")
    }

  private createCacheKey(
      liquidityPool: LiquidityPoolEntity,
      chainKey: ChainKey,
      network: Network,
  ) {
      return this.sha256Service.hash(
          `${liquidityPool.address}-${chainKey}-${network}`,
      )
  }

  private createTickCacheKey(
      liquidityPool: LiquidityPoolEntity,
      chainKey: ChainKey,
      network: Network,
      tick: bigint,
  ) {
      return this.sha256Service.hash(
          `${liquidityPool.address}-${chainKey}-${network}-${tick.toString()}`,
      )
  }

  public async getTicks({
      liquidityPool,
      chainKey,
      network,
      ticks,
  }: GetTicksParams): Promise<Record<string, TickData>> {
      const results: Record<string, TickData> = {}

      const wrr = this.wrrMap[chainKey]?.[network]
      if (!wrr) throw new Error("No RPC available")

      const provider = new MulticallProvider(
          new ethers.JsonRpcProvider(wrr.get().server),
      )
      const contract = new ethers.Contract(
          liquidityPool.address,
          clmmAbi,
          provider,
      )

      try {
          const tickPromises = ticks.map((tick) =>
              contract
                  .getFunction("ticks")
                  .staticCall(tick)
                  .then(
                      ([
                          liquidityGross,
                          liquidityNet,
                          feeGrowthOutside0X128,
                          feeGrowthOutside1X128,
                          tickCumulativeOutside,
                          secondsPerLiquidityOutsideX128,
                          secondsOutside,
                          initialized,
                      ]: [
              string,
              string,
              string,
              string,
              string,
              string,
              string,
              boolean,
            ]) => {
                          return {
                              tick: BigInt(tick),
                              liquidityGross: BigInt(liquidityGross),
                              liquidityNet: BigInt(liquidityNet),
                              feeGrowthOutside0X128: BigInt(feeGrowthOutside0X128),
                              feeGrowthOutside1X128: BigInt(feeGrowthOutside1X128),
                              tickCumulativeOutside: BigInt(tickCumulativeOutside),
                              secondsPerLiquidityOutsideX128: BigInt(
                                  secondsPerLiquidityOutsideX128,
                              ),
                              secondsOutside: BigInt(secondsOutside),
                              initialized: Boolean(initialized),
                          }
                      },
                  ),
          )
          const tickResults = await Promise.all(tickPromises)
          for (const tick of tickResults) {
              results[tick.tick.toString()] = tick
          }
          // cache the results
          for (const [tick, tickData] of Object.entries(results)) {
              await this.cacheManager.set<CachedTickData>(
                  this.createTickCacheKey(
                      liquidityPool,
                      chainKey,
                      network,
                      BigInt(tick),
                  ),
                  {
                      liquidityGross: tickData.liquidityGross.toString(),
                      liquidityNet: tickData.liquidityNet.toString(),
                      feeGrowthOutside0X128: tickData.feeGrowthOutside0X128.toString(),
                      feeGrowthOutside1X128: tickData.feeGrowthOutside1X128.toString(),
                      tickCumulativeOutside: tickData.tickCumulativeOutside.toString(),
                      secondsPerLiquidityOutsideX128:
              tickData.secondsPerLiquidityOutsideX128.toString(),
                      secondsOutside: tickData.secondsOutside.toString(),
                      initialized: tickData.initialized,
                  },
                  0,
              )
          }
          return results
      } catch (err) {
          this.logger.error("CLMM getTicks failed", err)
          throw new Error("Failed to get CLMM ticks")
      }
  }

  public async getClmmState(
      params: GetClmmStateParams,
  ): Promise<GetClmmStateResult> {
      const cacheKey = this.createCacheKey(
          params.liquidityPool,
          params.chainKey,
          params.network,
      )
      const cached =
      await this.cacheManager.get<CachedQueryClmmStateResult>(cacheKey)
      if (cached) {
          return {
              sqrtPriceX96: BigInt(cached.sqrtPriceX96 || "0"),
              tick: BigInt(cached.tick || "0"),
              liquidity: BigInt(cached.liquidity || "0"),
              tickSpacing: BigInt(cached.tickSpacing || "0"),
          }
      }

      return this.queryClmmState(params)
  }

  public async getTickData(
      liquidityPool: LiquidityPoolEntity,
      chainKey: ChainKey,
      network: Network,
      tick: bigint,
  ): Promise<TickData | null> {
      const cacheKey = this.createTickCacheKey(
          liquidityPool,
          chainKey,
          network,
          tick,
      )
      const cached = await this.cacheManager.get<CachedTickData>(cacheKey)
      if (cached) {
          return {
              liquidityGross: BigInt(cached.liquidityGross),
              liquidityNet: BigInt(cached.liquidityNet),
              feeGrowthOutside0X128: BigInt(cached.feeGrowthOutside0X128),
              feeGrowthOutside1X128: BigInt(cached.feeGrowthOutside1X128),
              tickCumulativeOutside: BigInt(cached.tickCumulativeOutside),
              secondsPerLiquidityOutsideX128: BigInt(
                  cached.secondsPerLiquidityOutsideX128,
              ),
              secondsOutside: BigInt(cached.secondsOutside),
              initialized: cached.initialized,
          }
      }
      return null
  }

  public async quote({
      amountIn,
      chainKey,
      liquidityPool,
      network,
      xForY,
  }: QuoteParams): Promise<QuoteResult> {
      try {
          const clmmState = await this.getClmmState({
              liquidityPool,
              chainKey,
              network,
          })
          const tokenX = new Token(
              0, // we do not need the chain id since we dont do on-chain token
              liquidityPool.tokenX.address || "",
              liquidityPool.tokenX.decimals,
              liquidityPool.tokenX.symbol,
              liquidityPool.tokenX.name,
          )
          const tokenY = new Token(
              0, // we do not need the chain id since we dont do on-chain token
              liquidityPool.tokenY.address || "",
              liquidityPool.tokenY.decimals,
              liquidityPool.tokenY.symbol,
              liquidityPool.tokenY.name,
          )
          const tickDataProvider: TickDataProvider = {
              getTick: async (tick) => {
                  const tickData = await this.getTickData(
                      liquidityPool,
                      chainKey,
                      network,
                      BigInt(tick)
                  )
                  if (!tickData) throw new Error("Tick data not found")
                  return {
                      liquidityNet: tickData.liquidityNet.toString(),
                  }
              },
              nextInitializedTickWithinOneWord: async (tick, lte, tickSpacing) => {
                  let compressed = Math.floor(Number(tick) / Number(tickSpacing))
                  if (!lte) compressed += 1
                  const wordPos = Math.floor(compressed / 256)
                  const minTickInWord = wordPos * 256
                  const maxTickInWord = minTickInWord + 255
                  let nextTick = compressed
                  while (
                      nextTick >= minTickInWord &&
              nextTick <= maxTickInWord
                  ) {
                      const realTick = nextTick * Number(tickSpacing)
                      const tickData = await this.getTickData(
                          liquidityPool,
                          chainKey,
                          network,
                          BigInt(realTick)
                      )
                      if (tickData && BigInt(tickData.liquidityNet) !== 0n) {
                          return [realTick, true]
                      }
                      nextTick += lte ? -1 : 1
                  }
      
                  const boundaryTick = (lte ? minTickInWord : maxTickInWord) * Number(tickSpacing)
                  return [boundaryTick, false]
              },
          }
          const v3Pool = new V3Pool(
              tokenX,
              tokenY,
              computeFeeTierRaw(liquidityPool.feeTier), // fee 0.25% = 2500
              Number(clmmState.tickSpacing),
              clmmState.sqrtPriceX96.toString(),
              clmmState.liquidity.toString(),
              Number(clmmState.tick),
              tickDataProvider
          )

          const tokenIn = xForY ? tokenX : tokenY
          const [amount] = await v3Pool.getOutputAmount(
              CurrencyAmount.fromRawAmount(tokenIn, computeRaw(amountIn, tokenIn.decimals).toString()),
          )
          const amountOut = amount.toExact()
          return {
              amount: Number(amountOut),
              estimatedGas: 0,
          }
      } catch (err) {
          this.logger.error("CLMM quote failed", err)
          throw new Error("Failed to quote CLMM")
      }
  }

  private async queryClmmState({
      liquidityPool,
      chainKey,
      network,
  }: QueryClmmStateParams): Promise<QueryClmmStateResult> {
      const cacheKey = this.createCacheKey(liquidityPool, chainKey, network)
      const wrr = this.wrrMap[chainKey]?.[network]
      if (!wrr) throw new Error("No RPC available")

      const provider = new MulticallProvider(
          new ethers.JsonRpcProvider(wrr.get().server),
      )
      const contract = new ethers.Contract(
          liquidityPool.address,
          clmmAbi,
          provider,
      )

      try {
          const [slot0, liquidity, tickSpacing] = await Promise.all([
              contract.getFunction("slot0").staticCall(),
              contract.getFunction("liquidity").staticCall(),
              contract.getFunction("tickSpacing").staticCall(),
          ])
          const result: QueryClmmStateResult = {
              sqrtPriceX96: BigInt(slot0.sqrtPriceX96),
              tick: BigInt(slot0.tick),
              liquidity: BigInt(liquidity),
              tickSpacing: BigInt(tickSpacing),
          }
          const lowerTick = result.tick - (result.tick % result.tickSpacing)
          const lowerTicks = Array.from(
              { length: 10 },
              (_, i) => lowerTick - BigInt(i) * result.tickSpacing,
          )
          const upperTicks = Array.from(
              { length: 10 },
              (_, i) => lowerTick + BigInt(i) * result.tickSpacing,
          )
          // get the ticks
          await this.getTicks({
              liquidityPool,
              chainKey,
              network,
              ticks: [...lowerTicks, ...upperTicks],
          })
          await this.cacheManager.set<CachedQueryClmmStateResult>(
              cacheKey,
              {
                  sqrtPriceX96: result.sqrtPriceX96.toString(),
                  tick: result.tick.toString(),
                  liquidity: result.liquidity.toString(),
                  tickSpacing: result.tickSpacing.toString(),
              },
              0,
          )

          return result
      } catch (err) {
          this.logger.error("CLMM query failed", err)
          throw new Error("Failed to query CLMM state")
      }
  }
}

// ========== Interfaces ==========
export interface QueryClmmStateParams {
  liquidityPool: LiquidityPoolEntity;
  chainKey: ChainKey;
  network: Network;
}

export type GetClmmStateParams = QueryClmmStateParams;

export interface QueryClmmStateResult {
  sqrtPriceX96: bigint;
  tick: bigint;
  liquidity: bigint;
  tickSpacing: bigint;
}

export interface CachedQueryClmmStateResult {
  sqrtPriceX96: string;
  tick: string;
  liquidity: string;
  tickSpacing: string;
}

export type GetClmmStateResult = QueryClmmStateResult;

export interface GetTicksParams {
  liquidityPool: LiquidityPoolEntity;
  chainKey: ChainKey;
  network: Network;
  ticks: Array<bigint>;
}

export interface TickData {
  liquidityGross: bigint;
  liquidityNet: bigint;
  feeGrowthOutside0X128: bigint;
  feeGrowthOutside1X128: bigint;
  tickCumulativeOutside: bigint;
  secondsPerLiquidityOutsideX128: bigint;
  secondsOutside: bigint;
  initialized: boolean;
}

export interface CachedTickData {
  liquidityGross: string;
  liquidityNet: string;
  feeGrowthOutside0X128: string;
  feeGrowthOutside1X128: string;
  tickCumulativeOutside: string;
  secondsPerLiquidityOutsideX128: string;
  secondsOutside: string;
  initialized: boolean;
}
