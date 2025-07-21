import { ChainKey, Network } from "@/modules/blockchain"
import { MemDbService, TokenEntity } from "@/modules/databases"
import { Injectable } from "@nestjs/common"
import { TokenAddress } from "../core.interface"

@Injectable()
export class QueryTokenService {
    constructor(
        private readonly memDbService: MemDbService
    ) {}
    
    public async getEntity(
        {
            chainKey,
            network,
            tokenAddress
        }: GetEntityParams
    ) {
        let tokenEntity: TokenEntity | undefined
        if (!tokenAddress) {
            tokenEntity = this.memDbService.tokens.find(
                (token) =>
                    token.native &&
          token.network === network &&
          token.chainKey === chainKey,
            )
        } else {
            tokenEntity = this.memDbService.tokens.find(
                (token) =>
                    token.address === tokenAddress &&
          token.network === network &&
          token.chainKey === chainKey,
            )
        }
        if (!tokenEntity) {
            throw new Error(`Token ${tokenAddress} not found`)
        }
        return tokenEntity
    }
}   

export interface GetEntityParams {
    tokenAddress?: TokenAddress,
    chainKey: ChainKey,
    network: Network,
}