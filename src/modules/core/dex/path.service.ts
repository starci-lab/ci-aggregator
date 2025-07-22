import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common"
import { GraphService, GraphEdge } from "./graph.service"
import { TokenAddress } from "../core.interface"
import {
    DexEntity,
    MemDbService,
    PoolTypeEnum,
    TokenId,
} from "@/modules/databases"
import { ChainKey, Network } from "@/modules/blockchain"
import { Sha256Service } from "@/modules/cryptography"

export interface RoutePath {
  nodes: Array<TokenAddress>;
  edges: Array<GraphEdge>;
  allocation: number; // percentage of total amount used in this path (0-100)
  totalAmountOut: number;
  dex: DexEntity;
}

export interface GetKBestExactInPathsParams {
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
  tokenIn: TokenAddress;
  tokenOut: TokenAddress;
  amountIn: number;
  k: number;
}

export interface GetKBestExactOutPathsParams {
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
  tokenIn: TokenAddress;
  tokenOut: TokenAddress;
  amountOut: number;
  k: number;
}

export interface GetKBestPathsParams {
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
  tokenIn: TokenAddress;
  tokenOut: TokenAddress;
  amountSpecified: number;
  exactIn?: boolean;
  k: number;
}

@Injectable()
export class PathService implements OnApplicationBootstrap {
    constructor(
    private readonly memDbService: MemDbService,
    private readonly graphService: GraphService,
    private readonly sha256Service: Sha256Service,
    ) {}

    private readonly logger = new Logger(PathService.name)
    async onApplicationBootstrap() {
        this.logger.verbose("Finding paths...")
        const time = new Date()
        const params: GetKBestExactInPathsParams = {
            chainKey: ChainKey.Monad,
            network: Network.Testnet,
            poolType: PoolTypeEnum.Clmm,
            tokenIn: TokenId.MonadTestnetWmon,
            tokenOut: TokenId.MonadTestnetUsdc,
            amountIn: 1,
            k: 3,
        }
        const paths = await this.getKBestExactInSwapPaths(params)
        console.dir(
            paths.map((path) => ({
                nodes: path.nodes,
                edges: path.edges.map((edge) => ({
                    id: edge.liquidityPool.id,
                    address: edge.liquidityPool.address,
                    poolType: edge.liquidityPool.poolType,
                })),
                allocation: path.allocation,
                totalAmountOut: path.totalAmountOut,
                dex: path.dex.id,
            })),
            {
                depth: null,
            },
        )
        this.logger.verbose(
            `Found ${paths.length} paths in ${new Date().getTime() - time.getTime()}ms`,
        )
    }

    private async getKBestExactInSwapPaths({
        chainKey,
        network,
        poolType,
        tokenIn,
        tokenOut,
        amountIn,
        k,
    }: GetKBestExactInPathsParams): Promise<Array<RoutePath>> {
        const dexes = this.memDbService.dexes
        const candidatesMap = new Map<string, RoutePath>()
        for (const dex of dexes) {
            const graph = this.graphService.getGraph({
                dex,
                chainKey,
                network,
                poolType,
            })
            if (!graph) continue

            const quotePaths = await this.graphService.getQuotePaths({
                graph,
                startId: tokenIn,
                endId: tokenOut,
                maxDepth: 3,
            })

            for (const quotePath of quotePaths) {
                const quoteAllocations = await this.graphService.simulateAllocatedSwap({
                    amountSpecified: amountIn,
                    quotePath,
                })

                for (const [allocationStr, amountOut] of Object.entries(
                    quoteAllocations,
                )) {
                    const allocation = parseInt(allocationStr)
                    const nodes: Array<TokenAddress> = [tokenIn]
                    for (const edge of quotePath.edges) {
                        const lastNode = nodes[nodes.length - 1]
                        const nextNode = edge.to === lastNode ? edge.token.id : edge.to
                        nodes.push(nextNode)
                    }

                    // Create a unique key based on the edges
                    const key = this.sha256Service.hash(
                        quotePath.edges
                            .map(
                                (edge) =>
                                    `${edge.token.id}-${edge.to}-${edge.liquidityPool.id}`,
                            )
                            .join("-"),
                    )

                    const existing = candidatesMap.get(key)
                    if (!existing || allocation > existing.allocation) {
                        candidatesMap.set(key, {
                            allocation,
                            totalAmountOut: amountOut,
                            nodes,
                            edges: quotePath.edges,
                            dex,
                        })
                    }
                }
            }
        }

        // Convert map to array and sort
        const candidates = Array.from(candidatesMap.values())
        const topK = candidates
            .sort((a, b) => b.allocation - a.allocation)
            .slice(0, k)

        // Normalize allocation to sum = 100
        const totalAlloc = topK.reduce((sum, r) => sum + r.allocation, 0)
        if (totalAlloc > 0) {
            for (const r of topK) {
                r.allocation = (r.allocation / totalAlloc) * 100
            }
        }

        return topK
    }

    private async getKBestExactOutSwapPaths({
        chainKey,
        network,
        poolType,
        tokenIn,
        tokenOut,
        amountOut,
        k,
    }: GetKBestExactOutPathsParams): Promise<Array<RoutePath>> {
        const dexes = this.memDbService.dexes
        const candidatesMap = new Map<string, RoutePath>()
        for (const dex of dexes) {
            const graph = this.graphService.getGraph({
                dex,
                chainKey,
                network,
                poolType,
            })
            if (!graph) continue

            const quotePaths = await this.graphService.getQuotePaths({
                graph,
                startId: tokenIn,
                endId: tokenOut,
                maxDepth: 3,
            })

            for (const quotePath of quotePaths) {
                const quoteAllocations = await this.graphService.simulateAllocatedSwap({
                    amountSpecified: amountOut,
                    quotePath,
                    exactIn: false,
                })

                for (const [allocationStr, amountOut] of Object.entries(
                    quoteAllocations,
                )) {
                    const allocation = parseInt(allocationStr)
                    const nodes: Array<TokenAddress> = [tokenIn]
                    for (const edge of quotePath.edges) {
                        const lastNode = nodes[nodes.length - 1]
                        const nextNode = edge.to === lastNode ? edge.token.id : edge.to
                        nodes.push(nextNode)
                    }

                    // Create a unique key based on the edges
                    const key = this.sha256Service.hash(
                        quotePath.edges
                            .map(
                                (edge) =>
                                    `${edge.token.id}-${edge.to}-${edge.liquidityPool.id}`,
                            )
                            .join("-"),
                    )

                    const existing = candidatesMap.get(key)
                    if (!existing || allocation > existing.allocation) {
                        candidatesMap.set(key, {
                            allocation,
                            totalAmountOut: amountOut,
                            nodes,
                            edges: quotePath.edges,
                            dex,
                        })
                    }
                }
            }
        }

        // Convert map to array and sort
        const candidates = Array.from(candidatesMap.values())
        const topK = candidates
            .sort((a, b) => b.allocation - a.allocation)
            .slice(0, k)

        // Normalize allocation to sum = 100
        const totalAlloc = topK.reduce((sum, r) => sum + r.allocation, 0)
        if (totalAlloc > 0) {
            for (const r of topK) {
                r.allocation = (r.allocation / totalAlloc) * 100
            }
        }

        return topK
    }

    async getKBestSwapPaths({
        chainKey,
        network,
        poolType,
        tokenIn,
        tokenOut,
        amountSpecified,
        exactIn,
        k,
    }: GetKBestPathsParams): Promise<Array<RoutePath>> {
        if (exactIn) {
            return this.getKBestExactInSwapPaths({
                chainKey,
                network,
                poolType,
                tokenIn,
                tokenOut,
                amountIn: amountSpecified,
                k,
            })
        } else {
            return this.getKBestExactOutSwapPaths({
                chainKey,
                network,
                poolType,
                tokenIn,
                tokenOut,
                amountOut: amountSpecified,
                k,
            })
        }
    }
}
