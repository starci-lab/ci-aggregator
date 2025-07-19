import { Injectable, OnModuleInit } from "@nestjs/common"
import { LiquidityPoolEntity, TokenEntity } from "@/modules/databases"
import { NATIVE } from "../core.interface"
import { ethers } from "ethers"
import { ammAbi, blockchainRpc, ChainKey, Network } from "@/modules/blockchain"
import { WeightedRoundRobin, WeightedRoundRobinService } from "@/modules/balancer"

@Injectable()
export class QuoteService implements OnModuleInit {
    private wrrMap: Record<ChainKey, Record<Network, WeightedRoundRobin<string>>>
    constructor(
        private readonly wrrService: WeightedRoundRobinService,
    ) {
        for (const chainKey of Object.values(ChainKey)) {
            for (const network of Object.values(Network)) {
                this.wrrMap[chainKey][network] = this.wrrService.createInstance({
                    valueWeights: blockchainRpc()[chainKey][network].map(({
                        url,
                        weight
                    }) => ({
                        value: url,
                        weight
                    }))
                })
            }
        }   
    }
    onModuleInit() {
        console.log("QuoteService initialized")
    }

    async quoteAmmSinglePool({
        amountIn,
        fromToken,
        toToken,
        liquidityPool,
        chainKey,
        network
    }: QuoteAmmParams) {
        // Determine the swap method name
        let methodName: string | undefined
        if (fromToken.address === NATIVE) {
            methodName = liquidityPool.methodSwapExactEthForTokens
        } else if (toToken.address === NATIVE) {
            methodName = liquidityPool.methodSwapExactTokensForEth
        } else {
            methodName = liquidityPool.methodSwapExactTokensForTokens
        }

        if (!methodName) {
            throw new Error("Swap method not found in pool config")
        }

        // Prepare ethers contract
        if (!liquidityPool.routerAddress) {
            throw new Error("Router address not found")
        }
        const wrr = this.wrrMap[chainKey][network]
        const provider = new ethers.JsonRpcProvider(wrr.next()) // replace with actual rpc or inject
        const contract = new ethers.Contract(
            liquidityPool.routerAddress,
            ammAbi,
            provider,
        )

        // This is just an example. You need to build correct calldata based on method.
        // Usually for a quote (static call), you'd use `callStatic`:
        try {
            const result = await contract.callStatic[methodName](
                ...this.buildSwapArgs({
                    amountIn,
                    fromToken,
                    toToken,
                    liquidityPool,
                    chainKey,
                    network
                }),
            )

            console.log("Swap quote result:", result)
            return result
        } catch (error) {
            console.error("Swap quote error:", error)
            throw new Error("Failed to quote")
        }
    }

    // 🔧 Helper to build method arguments depending on swap type
    private buildSwapArgs({
        amountIn,
        fromToken,
        toToken,
        liquidityPool,
    }: QuoteAmmParams): any[] {
        const path = [fromToken.address, toToken.address]
        const minAmountOut = 1 // just a placeholder
        const to = ethers.ZeroAddress // Or user address
        const deadline = Math.floor(Date.now() / 1000) + 1800 // 30 min from now

        if (fromToken.address === NATIVE) {
            return [minAmountOut, path, to, deadline]
        } else if (toToken.address === NATIVE) {
            return [amountIn, minAmountOut, path, to, deadline]
        } else {
            return [amountIn, minAmountOut, path, to, deadline]
        }
    }
}

export interface QuoteAmmParams {
  amountIn: string; // The input amount (in raw units, e.g. wei or smallest unit)
  liquidityPool: LiquidityPoolEntity;
  fromToken: TokenEntity;
  toToken: TokenEntity;
  chainKey: ChainKey;
  network: Network;
}
