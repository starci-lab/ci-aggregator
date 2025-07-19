import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import {
    PostgreSQLModule,
    SeedingModule as PostgreSQLSeedingModle,
    MemDbModule as PostgreSQLMemDbModule,
} from "@/modules/databases"
import { EnvModule } from "@/modules/env"
import { CoreModule } from "@/modules/core"
import { RoundRobinModule } from "@/modules/balancer"

@Module({
    imports: [
        EnvModule.forRoot(),
        RoundRobinModule.register({
            isGlobal: true
        }),
        PostgreSQLModule.forRoot(),
        PostgreSQLSeedingModle.register({}),
        PostgreSQLMemDbModule.register({
            isGlobal: true
        }),
        CoreModule.register({}),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
