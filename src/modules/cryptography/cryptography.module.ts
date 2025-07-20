import { Module } from "@nestjs/common"
import { Sha256Service } from "./sha256.service"
import { ConfigurableModuleClass } from "./cryptography.module-definition"

@Module({
    providers: [Sha256Service],
    exports: [Sha256Service],
})
export class CryptographyModule extends ConfigurableModuleClass {}
