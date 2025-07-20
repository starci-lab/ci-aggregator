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
                address: "0x264e9b75723d75E3c607627D8E21d2C758DB4c80",
                poolType: PoolTypeEnum.Amm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: TokenId.MonadTestnetWmon,
                tokenYId: TokenId.MonadTestnetUsdc,
                dexId: DexId.Bean,
                routerAddress: "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89",
            },
            {
                id: LiquidityPoolId.MonadTestnetPancakeSwapLpMonadUsdc1,
                address: "0xEd327Cd6660DdbD8466Ba4741aB6b394b0BcfFd7",
                poolType: PoolTypeEnum.Clmm,
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                tokenXId: TokenId.MonadTestnetWmon,
                tokenYId: TokenId.MonadTestnetUsdc,
                dexId: DexId.PancakeSwap,
            },
        ])
    }
}
