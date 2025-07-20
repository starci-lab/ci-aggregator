import { ChainKey, Network } from "../types"
import { IUpstreamOptions } from "balancer-round-robin"

export type BlockchainRpc = Record<ChainKey, Record<Network, Array<IUpstreamOptions>>>
export const blockchainRpc: BlockchainRpc = {
    [ChainKey.Monad]: {
        [Network.Mainnet]: [],
        [Network.Testnet]: [
            {
                server: "https://testnet-rpc.monad.xyz",
                weight: 3,
                maxFails: 1,
                failTimeout: 5000,
            }
            // },
            // {
            //     server: "https://monad-testnet.drpc.org",
            //     weight: 1,
            //     maxFails: 1,
            //     failTimeout: 5000,
            // }
        ]
    }
}