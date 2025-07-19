import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./dex.module-definition"
import { DexService } from "./dex.service"
import { QuoteService } from "./quote.service"

@Module({
    providers: [DexService, QuoteService],
    exports: [DexService],
})
export class DexModule extends ConfigurableModuleClass {}
