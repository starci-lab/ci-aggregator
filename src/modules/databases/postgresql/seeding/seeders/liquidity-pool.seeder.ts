import { Seeder } from "typeorm-extension"
import { DataSource } from "typeorm"
import { DexId, LiquidityPoolEntity, LiquidityPoolId, TokenId } from "../../entities"
import { PoolTypeEnum } from "../../entities/types"
import { ChainKey, Network } from "@/modules/blockchain"

export class LiquidityPoolSeeder implements Seeder {
    /**
   * Track seeder execution.
   *
   * Default: false
   */
    track = false
    public async run(dataSource: DataSource): Promise<void> {
        const repository =  dataSource.getRepository(LiquidityPoolEntity)
        await repository.save([
            {
                id: LiquidityPoolId.MonadTestnetBeanLpMonadUsdc1,
                address: "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89",
                poolType: PoolTypeEnum.Amm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: TokenId.MonadTestnetMon,
                tokenYId: TokenId.MonadTestnetUsdc,
                dexId: DexId.Bean,
            },
            {
                id: LiquidityPoolId.MonadTestnetPancakeSwapLpMonadUsdc1,
                address: "0x94D220C58A23AE0c2eE29344b00A30D1c2d9F1bc",
                poolType: PoolTypeEnum.Clmm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: TokenId.MonadTestnetMon,
                tokenYId: TokenId.MonadTestnetUsdc,
                dexId: DexId.PancakeSwap,
            },
        ])
    }
}
