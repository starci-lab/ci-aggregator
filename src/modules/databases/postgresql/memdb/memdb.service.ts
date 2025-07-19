import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { DataSource } from "typeorm"
import { InjectDataSource } from "@nestjs/typeorm"
import { LiquidityPoolEntity, TokenEntity } from "../entities"
import { envConfig } from "@/modules/env"

@Injectable()
export class MemDbService implements OnModuleInit {
    public tokens: Array<TokenEntity> = []
    public liquidityPools: Array<LiquidityPoolEntity> = []

    private readonly logger = new Logger(MemDbService.name)

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) {}

    async onModuleInit() {
        this.logger.verbose("Initializing memdb...")

        // Initial load
        await this.reloadAll()

        // Schedule reload every 30 seconds
        setInterval(() => {
            this.reloadAll().catch((err) => {
                this.logger.error("Failed to reload memdb", err)
            })
        }, envConfig().postgresql.refreshInterval)

        this.logger.verbose("Memdb initialized")
    }

    private async reloadAll() {
        const [tokens, liquidityPools] = await Promise.all([
            this.dataSource.manager.find(TokenEntity),
            this.dataSource.manager.find(LiquidityPoolEntity, {
                relations: {
                    dex: true
                }
            }),
        ])
        this.tokens = tokens
        this.liquidityPools = liquidityPools
        this.logger.verbose("Memdb cache updated")
    }

    async refresh() {
        await this.reloadAll()
    }
}