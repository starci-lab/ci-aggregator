import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./core.module-definition"
import { CoreService } from "./core.service"
import { DexModule } from "./dex"
import { QuoteService } from "./dex/quote.service"

@Module({
    imports: [DexModule.register({})],
    providers: [
        QuoteService,
        CoreService,
    ],
    exports: [QuoteService, CoreService],
})
export class CoreModule extends ConfigurableModuleClass {}
