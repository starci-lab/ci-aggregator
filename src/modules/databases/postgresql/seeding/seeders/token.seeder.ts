import { Seeder } from "typeorm-extension"
import { DataSource } from "typeorm"
import { ChainKey, Network } from "@/modules/blockchain"
import { TokenId, TokenEntity } from "../../entities"

export class TokenSeeder implements Seeder {
    /**
   * Track seeder execution.
   *
   * Default: false
   */
    track = false
    public async run(dataSource: DataSource): Promise<void> {
        const repository =  dataSource.getRepository(TokenEntity)
        await repository.save([
            {
                id: TokenId.MonadTestnetMon,
                symbol: "MON",
                name: "Monad",
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                decimals: 18,
                native: true,
            },
            {
                id: TokenId.MonadTestnetWmon,
                symbol: "WMON",
                name: "Wrapped Monad",
                address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                decimals: 18,
            },
            {
                id: TokenId.MonadTestnetUsdc,
                symbol: "USDC",
                name: "USD Coin",
                address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
                chainKey: ChainKey.Monad,
                network: Network.Testnet,
                decimals: 6,
            },
        ])
    }
}
