import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./dex.module-definition"
import { DexService } from "./dex.service"
import { AmmService } from "./amm.service"
import { ClmmService } from "./clmm.service"
import { QueryTokenService } from "./query-token.service"
import { GraphService } from "./graph.service"
import { PathService } from "./path.service"

@Module({
    providers: [
        QueryTokenService,
        DexService,
        AmmService,
        ClmmService,
        GraphService,
        PathService
    ],
    exports: [DexService],
})
export class DexModule extends ConfigurableModuleClass {}
