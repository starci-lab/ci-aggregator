import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { MemDbService, PoolTypeEnum } from "@/modules/databases"
import { AmmService } from "./amm.service"
import { ClmmService } from "./clmm.service"
import { ChainKey, Network } from "@/modules/blockchain"

@Injectable()
export class DexService implements OnModuleInit {
    private readonly logger = new Logger(DexService.name)
    constructor(
        private readonly memDbService: MemDbService,
        private readonly ammService: AmmService,
        private readonly clmmService: ClmmService,
    ) {}

    async onModuleInit() {
        const liquidityPool = this.memDbService.liquidityPools.find(
            lp => lp.poolType === PoolTypeEnum.Clmm
        )
        if (!liquidityPool) throw new Error("C")
        const x = await this.clmmService.getClmmState({
            chainKey: ChainKey.Monad,
            network: Network.Testnet,
            liquidityPool
        })
        console.log(x)
    }
}
