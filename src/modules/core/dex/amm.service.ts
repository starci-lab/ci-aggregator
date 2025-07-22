import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { LiquidityPoolEntity, MemDbService } from "@/modules/databases"
import { ethers } from "ethers"
import {
    ammAbi,
    blockchainRpc,
    ChainKey,
    Network,
} from "@/modules/blockchain"
import { WeightedRoundRobinService } from "@/modules/balancer"
import { UpstreamList } from "balancer-round-robin"
import { Cache } from "cache-manager"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Sha256Service } from "@/modules/cryptography"
import { Cron } from "@nestjs/schedule"
import { PoolTypeEnum } from "@/modules/databases"
import { IPool, QuoteExactInParams, QuoteResult, QuoteExactOutParams, QuoteParams } from "../core.interface"
import { computeAfterFee, computeBeforeFee, computeDenomination, computeRaw } from "@/modules/common"

@Injectable()
export class AmmService implements OnModuleInit, IPool {
    private readonly logger = new Logger(AmmService.name)
    private wrrMap: Partial<
    Record<ChainKey, Partial<Record<Network, UpstreamList>>>
  > = {}
    // we store the price in the redis cache, and each time we get the price, we update the cache

    constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly sha256Service: Sha256Service,
    private readonly wrrService: WeightedRoundRobinService,
    private readonly memDbService: MemDbService,
    ) {
        for (const chainKey of Object.values(ChainKey)) {
            if (!this.wrrMap[chainKey]) {
                this.wrrMap[chainKey] = {}
            }
            for (const network of Object.values(Network)) {
                const list = blockchainRpc[chainKey]?.[network] || []
        this.wrrMap[chainKey]![network] = this.wrrService.createInstance({
            list,
        })
            }
        }
    }

    async quote({
        exactIn = true,
        ...params
    }: QuoteParams): Promise<QuoteResult> {
        if (exactIn) {
            return this.quoteExactIn({
                ...params,
                amountIn: params.amountSpecified,
            })
        } else {
            return this.quoteExactOut({
                ...params,
                amountOut: params.amountSpecified
            })
        }
    }

    async onApplicationBootstrap() {
        // test quote, off-chain logic with v3 pool
        // we use 20 ticks to compute the price
        const liquidityPool = this.memDbService.liquidityPools.find(
            (pool) =>
                pool.poolType === PoolTypeEnum.Amm &&
      pool.chainKey === ChainKey.Monad &&
      pool.network === Network.Testnet,
        )!
        const { amount } = await this.quote({
            amountSpecified: 10,
            chainKey: ChainKey.Monad,
            liquidityPool,
            network: Network.Testnet,
            xForY: true,
            exactIn: false
        })
        console.log(`Swap 10 ${liquidityPool.tokenX.symbol} to ${liquidityPool.tokenY.symbol}`)
        console.log(`Pool address: ${liquidityPool.address}`)
        console.log(`Amount: ${amount}`)
    }

    async onModuleInit() {
        await this.updateAmmReserves()
    }

    public async quoteExactIn({
        amountIn,
        chainKey,
        liquidityPool,
        network,
        xForY,
    }: QuoteExactInParams): Promise<QuoteResult> {
        const { reserve0, reserve1 } = await this.getAmmReserves({
            liquidityPool,
            chainKey,
            network,
        })
        
        const tokenIn = xForY ? liquidityPool.tokenX : liquidityPool.tokenY
        const tokenOut = xForY ? liquidityPool.tokenY : liquidityPool.tokenX
            
        const reserveIn = xForY ? reserve0 : reserve1
        const reserveOut = xForY ? reserve1 : reserve0
        const k = reserveIn * reserveOut
        const reserveInAfter = reserveIn + computeRaw(amountIn, tokenIn.decimals)
        const reserveOutAfter = k / reserveInAfter
        const amountOutRaw = reserveOut-reserveOutAfter 
        const amountOut = computeAfterFee(
            amountOutRaw,
            liquidityPool.feeTier
        )
        return {
            amount: computeDenomination(amountOut, tokenOut.decimals),
            estimatedGas: 0,
        }
    }

    public async quoteExactOut({
        amountOut,
        chainKey,
        liquidityPool,
        network,
        xForY,
    }: QuoteExactOutParams): Promise<QuoteResult> {
        const { reserve0, reserve1 } = await this.getAmmReserves({
            liquidityPool,
            chainKey,
            network,
        })
        
        const tokenIn = xForY ? liquidityPool.tokenX : liquidityPool.tokenY
        const tokenOut = xForY ? liquidityPool.tokenY : liquidityPool.tokenX
            
        const reserveIn = xForY ? reserve0 : reserve1
        const reserveOut = xForY ? reserve1 : reserve0
        const k = reserveIn * reserveOut
        const reserveOutAfter = reserveOut - computeBeforeFee(
            computeRaw(
                amountOut, tokenOut.decimals
            )      
        )
        if (reserveOutAfter < 0) {
            throw new Error("Insufficient liquidity")
        }
        const reserveInAfter = k / reserveOutAfter
        const amountIn = reserveInAfter - reserveIn
        return {
            amount: computeDenomination(amountIn, tokenIn.decimals),
            estimatedGas: 0,
        }
    }

  // update the amm reserves every 3 seconds
  @Cron("*/3 * * * * *")
    async updateAmmReserves() {
        const liquidityPools = this.memDbService.liquidityPools.filter(
            (liquidityPool) => liquidityPool.poolType === PoolTypeEnum.Amm,
        )
        for (const liquidityPool of liquidityPools) {
            await this.queryAmmReserves({
                liquidityPool,
                chainKey: liquidityPool.chainKey,
                network: liquidityPool.network,
            })
        }
        this.logger.verbose("Updated AMM reserves")
    }

  private createCacheKey(
      liquidityPool: LiquidityPoolEntity,
      chainKey: ChainKey,
      network: Network,
  ) {
      // hash the liquidity pool address, chain key and network to avoid collision
      return this.sha256Service.hash(
          `${liquidityPool.address}-${chainKey}-${network}`,
      )
  }

  public async getAmmReserves({
      liquidityPool,
      chainKey,
      network,
  }: GetAmmReservesParams): Promise<GetAmmReservesResult> {
      const cacheKey = this.createCacheKey(liquidityPool, chainKey, network)
      const cachedReserves = await this.cacheManager.get<CachedAmmReservesResult>(cacheKey)
      if (cachedReserves) {
          return {
              reserve0: BigInt(cachedReserves.reserve0),
              reserve1: BigInt(cachedReserves.reserve1),
          }
      }
      return this.queryAmmReserves({
          liquidityPool,
          chainKey,
          network,
      })
  }

  private async queryAmmReserves({
      liquidityPool,
      chainKey,
      network,
  }: QueryAmmReservesParams): Promise<QueryAmmReservesResult> {
      // Determine the swap method name
      const cacheKey = this.createCacheKey(liquidityPool, chainKey, network)
      const wrr = this.wrrMap?.[chainKey]?.[network]
      if (!wrr) {
          throw new Error("Weighted Round Robin not found")
      }
      const provider = new ethers.JsonRpcProvider(wrr.get().server) // replace with actual rpc or inject
      const contract = new ethers.Contract(
          liquidityPool.address,
          ammAbi,
          provider,
      )
      try {
          const [reserve0, reserve1] = await contract
              .getFunction("getReserves")
              .staticCall()
          // permanent store the reserves in the cache
          await this.cacheManager.set<CachedAmmReservesResult>(
              cacheKey,
              {
                  reserve0: reserve0.toString(),
                  reserve1: reserve1.toString(),
              },
              0,
          )
          return {
              reserve0: BigInt(reserve0),
              reserve1: BigInt(reserve1),
          }
      } catch (error) {
          console.error("Swap quote error:", error)
          throw new Error("Failed to quote")
      }
  }
}

export interface QueryAmmReservesParams {
  liquidityPool: LiquidityPoolEntity;
  chainKey: ChainKey;
  network: Network;
}

export type GetAmmReservesParams = QueryAmmReservesParams;

export interface QueryAmmReservesResult {
  reserve0: bigint;
  reserve1: bigint;
}

export type GetAmmReservesResult = QueryAmmReservesResult;

export interface CachedAmmReservesResult {
    reserve0: string;
    reserve1: string;
}