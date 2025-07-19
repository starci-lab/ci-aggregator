import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./options.module-definition"
import { OptionsService } from "./options.service"

@Module({
    providers: [OptionsService],
    exports: [OptionsService],
})
export class OptionsModule extends ConfigurableModuleClass {}
