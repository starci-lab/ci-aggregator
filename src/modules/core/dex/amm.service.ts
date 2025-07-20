import { Inject, Injectable, Logger } from "@nestjs/common"
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

@Injectable()
export class AmmService {
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
      const cachedReserves = await this.cacheManager.get(cacheKey)
      if (cachedReserves) {
          return cachedReserves as GetAmmReservesResult
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
          await this.cacheManager.set(
              cacheKey,
              {
                  reserve0: reserve0.toString(),
                  reserve1: reserve1.toString(),
              },
              0,
          )
          return {
              reserve0,
              reserve1,
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
