import { Seeder } from "typeorm-extension"
import { DataSource } from "typeorm"
import { DexEntity, DexId } from "../../entities"

export class DexSeeder implements Seeder {
    /**
   * Track seeder execution.
   *
   * Default: false
   */
    track = false
    public async run(dataSource: DataSource): Promise<void> {
        const repository =  dataSource.getRepository(DexEntity)
        await repository.save([
            {
                id: DexId.PancakeSwap,
                name: "PancakeSwap",
                description: "PancakeSwap is a decentralized exchange (DEX) on the Monad blockchain.",
                url: "https://pancakeswap.finance",
            },
            {
                id: DexId.Bean,
                name: "Bean",
                description: "Bean is a decentralized exchange (DEX) on the Monad blockchain.",
                url: "https://swap.bean.exchange/",
            }
        ])
    }
}
