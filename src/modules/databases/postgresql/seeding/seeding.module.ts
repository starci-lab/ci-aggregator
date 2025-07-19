import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./seeding.module-definition"
import { SeedingService } from "./seeding.service"

@Module({
    providers: [SeedingService],
    exports: [SeedingService],
})
export class SeedingModule extends ConfigurableModuleClass {}
