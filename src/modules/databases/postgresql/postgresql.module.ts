import { DynamicModule, Module } from "@nestjs/common"
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm"
import { envConfig } from "@/modules/env"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from "./postgresql.module-definition"
import {
    CexEntity,
    DexEntity,
    LiquidityPoolEntity,
    TokenEntity,
} from "./entities"

@Module({})
export class PostgreSQLModule extends ConfigurableModuleClass {
    public static forRoot(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.forRoot(options)

        const { host, port, username, password, dbName } = envConfig().postgresql

        const typeOrmOptions: TypeOrmModuleOptions = {
            type: "postgres",
            host,
            port,
            username,
            password,
            database: dbName,
            autoLoadEntities: true,
            synchronize: true, // Set to true only in development if you want TypeORM to auto-sync DB schema
            logging: true,
        }

        return {
            ...dynamicModule,
            imports: [
                TypeOrmModule.forRoot(typeOrmOptions),
                this.forFeature(),
            ],
        }
    }

    private static forFeature(): DynamicModule {
    // Optionally customize which entities to include based on input options
        return {
            module: PostgreSQLModule,
            imports: [
                TypeOrmModule.forFeature([
                    CexEntity,
                    DexEntity,
                    LiquidityPoolEntity,
                    TokenEntity,
                ]),
            ],
        }
    }
}
