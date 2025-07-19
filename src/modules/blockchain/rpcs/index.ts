import { ChainKey, Network } from "../types"

export const blockchainRpc = () => {
    return {
        [ChainKey.Monad]: {
            [Network.Mainnet]: [

            ],
            [Network.Testnet]: [
                {
                    url: "https://testnet-rpc.monad.xyz",
                    weight: 3
                },
                {
                    url: "https://monad-testnet.drpc.org",
                    weight: 1
                }
            ]
        }
    }
}