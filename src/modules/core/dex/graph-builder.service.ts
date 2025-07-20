// // graph-builder.service.ts
// import { CACHE_MANAGER } from "@nestjs/cache-manager"
// import { Inject, Injectable } from "@nestjs/common"
// import { MemDbService } from "@/modules/databases"
// import { Cache } from "cache-manager"

// export interface PoolEdge {
//   tokenIn: string;
//   tokenOut: string;
//   reserveIn: bigint;
//   reserveOut: bigint;
//   fee: number; // e.g. 0.003
//   poolAddress: string;
//   type: "amm" | "clmm";
// }

// export type Graph = Record<string, PoolEdge[]>;

// @Injectable()
// export class GraphBuilderService {
//     constructor(
//         @Inject(CACHE_MANAGER)
//         private readonly cacheManager: Cache,
//         private readonly memDbService: MemDbService,
//     ) {}

//     async buildGraph(): Promise<Graph> {
//         const graph: Graph = {}
//         const liquidityPools = this.memDbService.liquidityPools
//         for (const pool of liquidityPools) {
//             const edge01: PoolEdge = {
//                 tokenIn: pool.tokenXId,
//                 tokenOut: pool.tokenYId,
//                 reserveIn: BigInt(pool.reserve0),
//                 reserveOut: BigInt(pool.reserve1),
//                 fee: pool.fee || 0.003,
//                 poolAddress: pool.address,
//                 type: pool.type || "amm",
//             }

//             const edge10: PoolEdge = {
//                 tokenIn: pool.tokenYId,
//                 tokenOut: pool.tokenXId,
//                 reserveIn: BigInt(pool.reserve1),
//                 reserveOut: BigInt(pool.reserve0),
//                 fee: pool.fee || 0.003,
//                 poolAddress: pool.address,
//                 type: pool.type || "amm",
//             }

//             graph[pool.tokenXId] = graph[pool.tokenXId] || []
//             graph[pool.tokenYId] = graph[pool.tokenYId] || []
//             graph[pool.tokenXId].push(edge01)
//             graph[pool.tokenYId].push(edge10)
//         }

//         return graph
//     }
// }