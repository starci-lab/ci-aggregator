import { DynamicModule, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
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
import { OptionsModule, OptionsService } from "./options"

@Module({})
export class PostgreSQLModule extends ConfigurableModuleClass {
    public static forRoot(options: typeof OPTIONS_TYPE = {}): DynamicModule {
        const dynamicModule = super.forRoot(options)

        return {
            ...dynamicModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    imports: [OptionsModule.register({})],
                    inject: [OptionsService],
                    useFactory: (optionsService: OptionsService) =>
                        optionsService.getTypeOrmModuleOptions(),
                }),
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
