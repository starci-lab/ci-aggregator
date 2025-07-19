import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./round-robin.module-definition"
import { WeightedRoundRobinService } from "./weighted-round-robin.service"

@Module({
    providers: [WeightedRoundRobinService],
    exports: [WeightedRoundRobinService],
})
export class RoundRobinModule extends ConfigurableModuleClass {}
