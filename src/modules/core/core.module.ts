import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./core.module-definition"
import { CoreService } from "./core.service"
import { DexModule } from "./dex"

@Module({
    imports: [DexModule.register({})],
    providers: [
        CoreService,
    ],
    exports: [CoreService],
})
export class CoreModule extends ConfigurableModuleClass {}
