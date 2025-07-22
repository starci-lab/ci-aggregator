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
import { TokenAddress } from "../core.interface"
import { ChainKey, Network } from "@/modules/blockchain"
import { Sha256Service } from "@/modules/cryptography"

export interface GraphEdge {
  quoteExactIn: (amountIn: number) => Promise<number>;
  quoteExactOut: (amountOut: number) => Promise<number>;
  liquidityPool: LiquidityPoolEntity;
  token: TokenEntity;
  to: TokenAddress;
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
        console.log(this.graphs)
    }

    public getGraph(
        {
            dex,
            chainKey,
            network,
            poolType
        }: GetGraphParams
    ) {
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
                    if (liquidityPool.tokenX.id !== token.id && liquidityPool.tokenY.id !== token.id) {
                        continue
                    }
                    const edge: GraphEdge = {
                        quoteExactIn: async (amountIn: number) =>
                        {
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
                        to: liquidityPool.tokenY.id === token.id
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
                    if (liquidityPool.tokenX.id !== token.id && liquidityPool.tokenY.id !== token.id) {
                        continue
                    }
                    const edge: GraphEdge = {
                        quoteExactIn: async (amountIn: number) =>
                        {
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
                        to: liquidityPool.tokenY.id === token.id
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
}

export interface BuildGraphParams {
  dex: DexEntity;
  chainKey: ChainKey;
  network: Network;
  poolType: PoolTypeEnum;
}

export interface GetGraphParams {
    dex: DexEntity
    chainKey: ChainKey
    network: Network
    poolType: PoolTypeEnum
}
