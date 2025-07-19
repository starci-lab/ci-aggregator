import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { MemDbService, TokenEntity } from "@/modules/databases"
import { ICore, NATIVE, QuoteParams, QuoteResult, TokenAddress } from "../core.interface"
import { ChainKey, Network } from "@/modules/blockchain"
import { QuoteService } from "./quote.service"

@Injectable()
export class DexService implements ICore, OnModuleInit {
    private readonly logger = new Logger(DexService.name)
    constructor(
        private readonly memDbService: MemDbService,
        private readonly quoteService: QuoteService,
    
    ) {}

    async onModuleInit() {
        console.log(
            await this.quote({
                amountIn: "1000000000000000000",
                fromToken: NATIVE,
                toToken: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                deadline: 1721424000,
                slippage: 0.5,
                userAddress: "0xA7C1d79C7848c019bCb669f1649459bE9d076DA3",
                maxHops: 2,
            }),
        )
    }

    async quote({
        amountIn,
        fromToken,
        toToken,
        deadline,
        slippage,
        userAddress,
        maxHops = 2,
        chainKey = ChainKey.Monad,
        network = Network.Testnet,
    }: QuoteParams): Promise<QuoteResult> {
    // get token from
        const fromTokenEntity = this.getTokenEntity(fromToken, chainKey, network)
        const toTokenEntity = this.getTokenEntity(toToken, chainKey, network)
        // get all liquidity pools
        const liquidityPools = this.memDbService.liquidityPools
        await this.quoteService.quoteAmmSinglePool({
            fromToken: fromTokenEntity,
            toToken: toTokenEntity,
            liquidityPool: liquidityPools[0],
            amountIn,
            chainKey,
            network
        })
        return {
            amountOut: "0",
            route: [],
        }
    }

    private getTokenEntity(
        tokenAddress: TokenAddress,
        chainKey: ChainKey,
        network: Network,
    ) {
        let tokenEntity: TokenEntity | undefined
        if (tokenAddress === NATIVE) {
            tokenEntity = this.memDbService.tokens.find(
                (token) =>
                    token.native &&
          token.network === network &&
          token.chainKey === chainKey,
            )
        } else {
            tokenEntity = this.memDbService.tokens.find(
                (token) =>
                    token.address === tokenAddress &&
          token.network === network &&
          token.chainKey === chainKey,
            )
        }
        if (!tokenEntity) {
            throw new Error(`Token ${tokenAddress} not found`)
        }
        return tokenEntity
    }
}
