import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import {
    PostgreSQLModule,
    SeedingModule as PostgreSQLSeedingModle,
    MemDbModule as PostgreSQLMemDbModule,
} from "@/modules/databases"
import { EnvModule } from "@/modules/env"

@Module({
    imports: [
        EnvModule.forRoot(),
        PostgreSQLModule.forRoot(),
        PostgreSQLSeedingModle.register({}),
        PostgreSQLMemDbModule.register({}),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
