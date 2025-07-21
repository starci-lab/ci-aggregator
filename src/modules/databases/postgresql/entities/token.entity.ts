import { Column, Entity, OneToMany } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { Field, ObjectType, Int } from "@nestjs/graphql"
import { LiquidityPoolEntity } from "./liquiditiy-pool.entity"
import { ChainKey, Network } from "@/modules/blockchain"

@ObjectType()
@Entity("token")
export class TokenEntity extends StringAbstractEntity {
  @Field({ name: "symbol", description: "Token symbol" })
  @Column({ name: "symbol", unique: true })
      symbol: string

  @Field({ name: "name", description: "Token name" })
  @Column({ name: "name" })
      name: string

  @Field({
      name: "address",
      description: "Token contract address",
      nullable: true,
  })
  @Column({ name: "address", nullable: true })
      address?: string

  @Field({ name: "native", description: "Native token of blockchain" })
  @Column({ name: "native", default: false })
      native: boolean

  @Field({ name: "network", description: "Blockchain network" })
  @Column({ name: "network", default: Network.Testnet })
      network: Network

  @Field({ name: "chainKey", description: "Blockchain chain" })
  @Column({ name: "chain_key" })
      chainKey: ChainKey

  @Field(() => Int, { name: "decimals", description: "Token decimal places" })
  @Column({ name: "decimals", default: 18 })
      decimals: number

  @Field({ name: "logoUrl", description: "Token logo URL", nullable: true })
  @Column({ name: "logo_url", nullable: true })
      logoUrl?: string

  @Field({
      name: "coingeckoId",
      description: "Token ID on CoinGecko",
      nullable: true,
  })
  @Column({ name: "coingecko_id", nullable: true })
      coingeckoId?: string

  @Field(() => String, {
      name: "totalSupply",
      description: "Total supply of token",
      nullable: true,
  })
  @Column({ name: "total_supply", type: "numeric", nullable: true })
      totalSupply?: string

  @Field({ name: "projectId", description: "Project ID", nullable: true })
  @Column({ name: "project_id", nullable: true })
      projectId?: string

  // Map qua pool
  @Field(() => [LiquidityPoolEntity], {
      name: "liquidityPoolsAsX",
      description: "Liquidity pools with this token as token X",
      nullable: true,
  })
  @OneToMany(
      () => LiquidityPoolEntity,
      (liquiditiyPool) => liquiditiyPool.tokenX,
  )
      liquidityPoolsAsX?: Array<LiquidityPoolEntity>

  @Field(() => [LiquidityPoolEntity], {
      name: "liquidityPoolsAsY",
      description: "Liquidity pools with this token as token Y",
      nullable: true,
  })
  @OneToMany(
      () => LiquidityPoolEntity,
      (liquiditiyPool) => liquiditiyPool.tokenY,
  )
      liquidityPoolsAsY?: Array<LiquidityPoolEntity>
}
