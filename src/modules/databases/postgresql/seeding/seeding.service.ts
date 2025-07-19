import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { DataSource } from "typeorm"
import { runSeeders } from "typeorm-extension"
import { LiquidityPoolSeeder, TokenSeeder } from "./seeders"
import { InjectDataSource } from "@nestjs/typeorm"
import { DexSeeder } from "./seeders/dex.seeder"

@Injectable()
export class SeedingService implements OnModuleInit {
    private readonly logger = new Logger(SeedingService.name)
    constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    ) {}

    async onModuleInit() {
        this.logger.verbose("Running seeders...")
        await this.runSeeders()
        this.logger.verbose("Seeders completed")
    }

    async runSeeders() {
        await runSeeders(this.dataSource, {
            seeds: [DexSeeder, TokenSeeder, LiquidityPoolSeeder],
        })
    }
}
