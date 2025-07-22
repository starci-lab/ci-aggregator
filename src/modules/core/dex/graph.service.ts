import {
    DexEntity,
    LiquidityPoolEntity,
    MemDbService,
    PoolTypeEnum,
    TokenEntity,
} from "@/modules/databases"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { AmmService } from "./amm.service"
import { ClmmService } from "./clmm.service"
import { ChainKey, Network } from "@/modules/blockchain"
import { Sha256Service } from "@/modules/cryptography"
import { roundNumber } from "@/modules/common"

export interface GraphEdge {
  quoteExactIn: (amountIn: number) => Promise<number>;
  quoteExactOut: (amountOut: number) => Promise<number>;
  liquidityPool: LiquidityPoolEntity;
  token: TokenEntity;
  to: string;
}

// graph mean a token with all relavent
export type Graph = Record<string, Array<GraphEdge>>;

@Injectable()
export class GraphService implements OnModuleInit {
    public graphs: Record<string, Graph> = {}

    constructor(
    private readonly memDbService: MemDbService,
    private readonly ammService: AmmService,
    private readonly clmmService: ClmmService,
    private readonly sha256Service: Sha256Service,
    ) {}

    async onModuleInit() {
        const dexEntities = this.memDbService.dexes
        for (const dex of dexEntities) {
            const chainKeys = Object.values(ChainKey)
            for (const chainKey of chainKeys) {
                const networks = Object.values(Network)
                for (const network of networks) {
                    const poolTypes = Object.values(PoolTypeEnum)
                    for (const poolType of poolTypes) {
                        await this.buildGraph({ dex, chainKey, network, poolType })
                    }
                }
            }
        }
    }

    public getGraph({ dex, chainKey, network, poolType }: GetGraphParams) {
        const graphKey = this.createGraphKey(dex, chainKey, network, poolType)
        return this.graphs[graphKey]
    }

    private createGraphKey(
        dex: DexEntity,
        chainKey: ChainKey,
        network: Network,
        poolType: PoolTypeEnum,
    ) {
        return this.sha256Service.hash(
            `${dex.id}-${chainKey}-${network}-${poolType}`,
        )
    }

    private checkTokenExistInLiquidityPool(
        token: TokenEntity,
        liquidityPool: LiquidityPoolEntity,
    ): boolean {
        const isNativeExistInLiquidityPool =
      token.native &&
      (liquidityPool.tokenX.id === token.wrappedTokenId ||
        liquidityPool.tokenY.id === token.wrappedTokenId)
        const isTokenExistInLiquidityPool =
      liquidityPool.tokenX.id === token.id ||
      liquidityPool.tokenY.id === token.id
        return isNativeExistInLiquidityPool || isTokenExistInLiquidityPool
    }

    async buildGraph({ dex, chainKey, network, poolType }: BuildGraphParams) {
        const graphKey = this.createGraphKey(dex, chainKey, network, poolType)
        const liquidityPools = this.memDbService.liquidityPools.filter(
            (liquidityPool) =>
                liquidityPool.chainKey === chainKey &&
        liquidityPool.network === network &&
        liquidityPool.poolType === poolType &&
        liquidityPool.dex.id === dex.id,
        )
        const tokens = this.memDbService.tokens.filter(
            (token) => token.chainKey === chainKey && token.network === network,
        )
        switch (poolType) {
        case PoolTypeEnum.Amm: {
            for (const token of tokens) {
                const edges: Array<GraphEdge> = []
                for (const liquidityPool of liquidityPools) {
                    if (!this.checkTokenExistInLiquidityPool(token, liquidityPool)) {
                        continue
                    }
                    const edge: GraphEdge = {
                        quoteExactIn: async (amountIn: number) => {
                            const { amount } = await this.ammService.quoteExactIn({
                                liquidityPool,
                                chainKey,
                                network,
                                amountIn,
                                xForY: liquidityPool.tokenX.id === token.id,
                            })
                            return amount
                        },
                        quoteExactOut: async (amountOut: number) => {
                            const { amount } = await this.ammService.quoteExactOut({
                                liquidityPool,
                                chainKey,
                                network,
                                amountOut,
                                xForY: liquidityPool.tokenY.id === token.id,
                            })
                            return amount
                        },
                        liquidityPool,
                        token,
                        to:
                liquidityPool.tokenX.id === token.id
                    ? liquidityPool.tokenY.id
                    : liquidityPool.tokenX.id,
                    }
                    edges.push(edge)
                }
                if (!this.graphs[graphKey]) {
                    this.graphs[graphKey] = {}
                }
                this.graphs[graphKey][token.id] = edges
            }
            break
        }
        case PoolTypeEnum.Clmm: {
            for (const token of tokens) {
                const edges: Array<GraphEdge> = []
                for (const liquidityPool of liquidityPools) {
                    if (!this.checkTokenExistInLiquidityPool(token, liquidityPool)) {
                        continue
                    }
                    const edge: GraphEdge = {
                        quoteExactIn: async (amountIn: number) => {
                            const { amount } = await this.clmmService.quoteExactIn({
                                liquidityPool,
                                chainKey,
                                network,
                                amountIn,
                                xForY: liquidityPool.tokenX.id === token.id,
                            })
                            return amount
                        },
                        quoteExactOut: async (amountOut: number) => {
                            const { amount } = await this.clmmService.quoteExactOut({
                                liquidityPool,
                                chainKey,
                                network,
                                amountOut,
                                xForY: liquidityPool.tokenY.id === token.id,
                            })
                            return amount
                        },
                        liquidityPool,
                        token,
                        to:
                liquidityPool.tokenX.id === token.id
                    ? liquidityPool.tokenY.id
                    : liquidityPool.tokenX.id,
                    }
                    edges.push(edge)
                }
                if (!this.graphs[graphKey]) {
                    this.graphs[graphKey] = {}
                }
                this.graphs[graphKey][token.id] = edges
            }
            break
        }
        default:
            throw new Error(`Unsupported pool type: ${poolType}`)
        }
    }

    async getQuotePaths({
        graph,
        startId,
        endId,
        maxDepth = 3,
    }: GetQuotePathsParams): Promise<Array<QuotePath>> {
        const allPaths: Array<QuotePath> = []
        const dfs = (
            current: string,
            path: Array<string>,
            visited: Set<string>,
            edges: Array<GraphEdge>,
        ) => {
            if (path.length > maxDepth) return
            if (current === endId) {
                allPaths.push({ nodes: [...path], edges: [...edges] })
                return
            }
            for (const edge of graph[current] || []) {
                const next = edge.to
                if (visited.has(next)) continue
                visited.add(next)
                path.push(next)
                edges.push(edge)
                dfs(next, path, visited, edges)
                visited.delete(next)
                path.pop()
                edges.pop()
            }
        }
        dfs(startId, [startId], new Set([startId]), [])
        return allPaths
    }

    private async simulateAllocatedExactInSwap({
        amountIn,
        quotePath,
    }: SimulateAllocatedExactInSwapParams): Promise<QuoteAllocation> {
        const allocations = Array.from({ length: 100 }, (_, i) => i + 1)
        const promises = allocations.map(async (allocation) => {
            let amount = roundNumber((amountIn * allocation) / 100)

            for (const edge of quotePath.edges) {
                amount = await edge.quoteExactIn(amount)
            }

            return { allocation, amount }
        })
        const results = await Promise.all(promises)
        const quoteAllocations: QuoteAllocation = {}
        for (const { allocation, amount } of results) {
            quoteAllocations[allocation] = amount
        }
        return quoteAllocations
    }

    private async simulateAllocatedExactOutSwap({
        amountOut,
        quotePath,
    }: SimulateAllocatedExactOutSwapParams): Promise<QuoteAllocation> {
        const oneToOneHundred = Array.from({ length: 20 }, (_, i) => (i + 1) * 5)

        const reversedEdges = [...quotePath.edges].reverse() // avoid in-place mutation

        const promises = oneToOneHundred.map(async (allocation) => {
            let amountIn = roundNumber((amountOut * allocation) / 100)

            for (const edge of reversedEdges) {
                amountIn = await edge.quoteExactOut(amountIn)
            }

            return { allocation, amountIn }
        })

        const results = await Promise.all(promises)

        const quoteAllocations: QuoteAllocation = {}
        for (const { allocation, amountIn } of results) {
            quoteAllocations[allocation] = amountIn
        }

        return quoteAllocations
    }

    async simulateAllocatedSwap({
        amountSpecified,
        exactIn = true,
        quotePath,
    }: SimulateAllocatedSwapParams): Promise<QuoteAllocation> {
        return exactIn
            ? this.simulateAllocatedExactInSwap({
                amountIn: amountSpecified,
                quotePath,
            })
            : this.simulateAllocatedExactOutSwap({
                amountOut: amountSpecified,
                quotePath,
            })
    }
}

export interface SimulateAllocatedExactInSwapParams {
  amountIn: number;
  quotePath: QuotePath;
}

export interface SimulateAllocatedExactOutSwapParams {
  amountOut: number;
  quotePath: QuotePath;
}

export interface SimulateAllocatedSwapParams {
  amountSpecified: number;
  exactIn?: boolean; // default = true
  quotePath: QuotePath;
}

export type QuoteAllocation = Record<number, number>;

export interface GetAmounts {
  path: QuotePath;
  amountIn: number;
}

export interface QuotePath {
  nodes: Array<string>;
  edges: Array<GraphEdge>;
}

export interface GetQuotePathsParams {
  graph: Graph;
  startId: string;
  endId: string;
  maxDepth?: number;
}

export interface BuildGraphParams {
  dex: DexEntity;
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
}

export interface GetGraphParams {
  dex: DexEntity;
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
}
