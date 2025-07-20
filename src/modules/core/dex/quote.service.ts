import { Injectable } from "@nestjs/common"
import { LiquidityPoolEntity } from "@/modules/databases"
import { ethers } from "ethers"
import {
    uniswapV2PairAbi,
    blockchainRpc,
    ChainKey,
    Network,
} from "@/modules/blockchain"
import { WeightedRoundRobinService } from "@/modules/balancer"
import { UpstreamList } from "balancer-round-robin"

@Injectable()
export class QuoteService {
    private wrrMap: Partial<
    Record<ChainKey, Partial<Record<Network, UpstreamList>>>
  > = {}
    // we store the price in the redis cache, and each time we get the price, we update the cache
    
    constructor(private readonly wrrService: WeightedRoundRobinService) {
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

    async getAmmReserves({
        liquidityPool,
        chainKey,
        network,
    }: GetAmmReservesParams): Promise<GetAmmReservesResult> {
    // Determine the swap method name
        const wrr = this.wrrMap?.[chainKey]?.[network]
        if (!wrr) {
            throw new Error("Weighted Round Robin not found")
        }
        const provider = new ethers.JsonRpcProvider(wrr.get().server) // replace with actual rpc or inject
        const contract = new ethers.Contract(
            liquidityPool.address,
            uniswapV2PairAbi,
            provider,
        )
        try {
            const [reserve0, reserve1] = await contract
                .getFunction("getReserves")
                .staticCall()
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

export interface GetAmmReservesParams {
  liquidityPool: LiquidityPoolEntity;
  chainKey: ChainKey;
  network: Network;
}

export interface GetAmmReservesResult {
  reserve0: bigint;
  reserve1: bigint;
}
