import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { DataSource } from "typeorm"
import { InjectDataSource } from "@nestjs/typeorm"
import { DexEntity, LiquidityPoolEntity, TokenEntity } from "../entities"
import { Interval } from "@nestjs/schedule"

@Injectable()
export class MemDbService implements OnModuleInit {
    public tokens: Array<TokenEntity> = []
    public liquidityPools: Array<LiquidityPoolEntity> = []
    public dexes: Array<DexEntity> = []

    private readonly logger = new Logger(MemDbService.name)

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) {}

    async onModuleInit() {
        await this.reloadAll()
        this.logger.verbose("Memdb initialized")
    }

    @Interval(30_000)
    async updateMemDb() {
        await this.reloadAll()
        this.logger.verbose("Memdb updated")
    }

    private async reloadAll() {
        const [tokens, liquidityPools, dexes] = await Promise.all([
            this.dataSource.manager.find(TokenEntity, {
                relations: {
                    wrappedToken: true
                }
            }),
            this.dataSource.manager.find(LiquidityPoolEntity, {
                relations: {
                    dex: true,
                    tokenX: true,
                    tokenY: true,
                }
            }),
            this.dataSource.manager.find(DexEntity),
        ])
        this.tokens = tokens
        this.liquidityPools = liquidityPools
        this.dexes = dexes
        this.logger.verbose("Memdb cache updated")
    }

    async refresh() {
        await this.reloadAll()
    }
}