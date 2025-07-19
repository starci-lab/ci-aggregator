import { envConfig } from "@/modules/env"
import { Injectable } from "@nestjs/common"
import { TypeOrmModuleOptions } from "@nestjs/typeorm"
import { DataSourceOptions } from "typeorm"

@Injectable()
export class OptionsService {
    public getTypeOrmModuleOptions(): TypeOrmModuleOptions {
        return {
            type: "postgres",
            host: envConfig().postgresql.host,
            port: envConfig().postgresql.port,
            username: envConfig().postgresql.username,
            password: envConfig().postgresql.password,
            database: envConfig().postgresql.dbName,
            autoLoadEntities: true,
            synchronize: true, // Set to true only in development if you want TypeORM to auto-sync DB schema
            logging: false,
        }
    }
    public getDataSourceOptions(): DataSourceOptions {
        return {
            type: "postgres",
            host: envConfig().postgresql.host,
            port: envConfig().postgresql.port,
            username: envConfig().postgresql.username,
            password: envConfig().postgresql.password,
            database: envConfig().postgresql.dbName,
            synchronize: true, // Set to true only in development if you want TypeORM to auto-sync DB schema
            logging: false,
        }
    }
}
