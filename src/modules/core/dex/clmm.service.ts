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

import { LiquidityPoolEntity, PoolTypeEnum, MemDbService } from "@/modules/databases"
import { WeightedRoundRobinService } from "@/modules/balancer"
import { UpstreamList } from "balancer-round-robin"
import { Sha256Service } from "@/modules/cryptography"
import { Cron } from "@nestjs/schedule"

@Injectable()
export class ClmmService {
    private readonly logger = new Logger(ClmmService.name)
    private wrrMap: Partial<Record<ChainKey, Partial<Record<Network, UpstreamList>>>> = {}

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
        this.wrrMap[chainKey]![network] = this.wrrService.createInstance({ list })
            }
        }
    }

  @Cron("*/3 * * * * *")
    async updateClmmState() {
        const clmmPools = this.memDbService.liquidityPools.filter(
            pool => pool.poolType === PoolTypeEnum.Clmm,
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
      return this.sha256Service.hash(`${liquidityPool.address}-${chainKey}-${network}`)
  }

  public async getClmmState(params: GetClmmStateParams): Promise<GetClmmStateResult> {
      const cacheKey = this.createCacheKey(params.liquidityPool, params.chainKey, params.network)
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
      const contract = new ethers.Contract(liquidityPool.address, clmmAbi, provider)

      try {
          const [slot0, liquidity] = await Promise.all([
              contract.getFunction("slot0").staticCall(),
              contract.getFunction("liquidity").staticCall(),
          ])

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