import { Seeder } from "typeorm-extension"
import { DataSource } from "typeorm"
import { LiquidityPoolEntity } from "../../entities"
import { PoolTypeEnum } from "../../entities/types"
import { ChainKey, Network } from "@/modules/blockchain"

export class CexSeeder implements Seeder {
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
                id: "monad_testnet_lp_monad_usdc_1",
                address: "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89",
                poolType: PoolTypeEnum.Amm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: "monad_testnet_mon",
                tokenYId: "monad_testnet_usdc",
            },
            {
                id: "monad_testnet_lp_monad_usdc_2",
                address: "0x94D220C58A23AE0c2eE29344b00A30D1c2d9F1bc",
                poolType: PoolTypeEnum.Clmm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: "monad_testnet_mon",
                tokenYId: "monad_testnet_usdc",
            },
        ])
    }
}
