import { ChainKey } from "../blockchain/types"

export interface Dex {
    chainKey: ChainKey
    dexId: string
    dexName: string
    dexUrl: string
    dexLogo: string
    dexDescription: string
}