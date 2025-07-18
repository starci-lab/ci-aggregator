import { Seeder } from "typeorm-extension"
import { DataSource } from "typeorm"
import { TokenEntity } from "../../entities/token.entity"

export default class TokenSeeder implements Seeder {
    /**
     * Track seeder execution.
     *
     * Default: false
     */
    track = false

    public async run(
        dataSource: DataSource
    ): Promise<void> {
        const repository = dataSource.getRepository(TokenEntity)
        await repository.insert([
            {
                symbol: "MON",
                name: "Mon Token",
                chain: "Ethereum",
                decimals: 18
            },
            {
                symbol: "WMON",
                name: "WMon Token",
                address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
                chain: "Ethereum",
                decimals: 18
            },
            {
                symbol: "USDC",
                name: "USD Coin",
                address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
                chain: "Ethereum",
                decimals: 18
            }
        ])
    }
}   