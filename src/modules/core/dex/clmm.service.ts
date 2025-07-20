import { Inject, Injectable, Logger } from "@nestjs/common"
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

@Injectable()
export class ClmmService implements IPool {
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

    public async quote({
        amountIn,
        chainKey,
        liquidityPool,
        network,
        xForY,
    }: QuoteParams): Promise<QuoteResult> {
        const clmmState = await this.getClmmState({
            liquidityPool,
            chainKey,
            network,
        })
        const { sqrtPriceX96 } = clmmState
        const fee = BigInt(Math.floor((liquidityPool.feeTier || 0) * 1e6)) // 0.3% => 3000

        const Q96 = 2n ** 96n
        const Q192 = Q96 * Q96
        const priceX192 = sqrtPriceX96 * sqrtPriceX96 // full precision
        
        const amountInRaw = BigInt(amountIn * 1e18) // convert to 18 decimals
        let amountOutRaw: bigint
        if (xForY) {
            // token0 -> token1: out = in * price / Q192
            amountOutRaw = (amountInRaw * priceX192) / Q192
        } else {
            // token1 -> token0: out = in * Q192 / price
            amountOutRaw = (amountInRaw * Q192) / priceX192
        }

        // Apply fee: out = out * (1 - fee)
        const feeDenominator = 1_000_000n
        amountOutRaw = (amountOutRaw * (feeDenominator - fee)) / feeDenominator

        // Convert to float (for UI or display)
        const amountOut = Number(amountOutRaw) / 1e18

        return {
            amount: amountOut,
            estimatedGas: 0,
        }
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

  public async getClmmState(
      params: GetClmmStateParams,
  ): Promise<GetClmmStateResult> {
      const cacheKey = this.createCacheKey(
          params.liquidityPool,
          params.chainKey,
          params.network,
      )
      const cached = await this.cacheManager.get(cacheKey)
      if (cached) return cached as GetClmmStateResult

      return this.queryClmmState(params)
  }

  private async queryClmmState({
      liquidityPool,
      chainKey,
      network,
  }: QueryClmmStateParams): Promise<QueryClmmStateResult> {
      const cacheKey = this.createCacheKey(liquidityPool, chainKey, network)
      const wrr = this.wrrMap[chainKey]?.[network]
      if (!wrr) throw new Error("No RPC available")

      const provider = new ethers.JsonRpcProvider(wrr.get().server)
      const contract = new ethers.Contract(
          liquidityPool.address,
          clmmAbi,
          provider,
      )

      try {
          const [slot0, liquidity, token0] = await Promise.all([
              contract.getFunction("slot0").staticCall(),
              contract.getFunction("liquidity").staticCall(),
              contract.getFunction("token0").staticCall(),
          ])
          console.log(token0)

          const result: QueryClmmStateResult = {
              sqrtPriceX96: BigInt(slot0.sqrtPriceX96),
              tick: Number(slot0.tick),
              liquidity: BigInt(liquidity),
          }

          await this.cacheManager.set(
              cacheKey,
              {
                  sqrtPriceX96: result.sqrtPriceX96.toString(),
                  tick: result.tick,
                  liquidity: result.liquidity.toString(),
              },
              0, // Permanent cache; refreshed every 3s
          )

          return result
      } catch (err) {
          this.logger.error("CLMM query failed", err)
          throw new Error("Failed to query CLMM state")
      }
  }

    //   public getPrice(
    //       liquidityPool: LiquidityPoolEntity,
    //       chainKey: ChainKey,
    //       network: Network,
    //       amountIn: bigint,
    //       amountOut: bigint,
    //   ) {
    //       const clmmState = await this.getClmmState({ liquidityPool, chainKey, network })
    //   }
}
export interface QueryClmmStateParams {
  liquidityPool: LiquidityPoolEntity;
  chainKey: ChainKey;
  network: Network;
}

export type GetClmmStateParams = QueryClmmStateParams;

export interface QueryClmmStateResult {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}

export type GetClmmStateResult = QueryClmmStateResult;
