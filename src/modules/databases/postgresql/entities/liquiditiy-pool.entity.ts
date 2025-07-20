import { Entity, Column, ManyToOne, JoinColumn } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { DexEntity } from "./dex.entity"
import { TokenEntity } from "./token.entity"
import { Field, ObjectType } from "@nestjs/graphql"
import { PoolTypeEnum, ResponsePattern } from "./types"
import { Network } from "@/modules/blockchain"
import { ChainKey } from "@/modules/blockchain"

@ObjectType()
@Entity("liquidity_pool")
export class LiquidityPoolEntity extends StringAbstractEntity {
  @Field(() => DexEntity)
  @ManyToOne(() => DexEntity, (dex) => dex.liquidityPools)
  @JoinColumn({ name: "dex_id" })
      dex: DexEntity

  @Field(() => String)
  @Column({ name: "dex_id" })
      dexId: string

  @Field()
  @Column({ name: "address", unique: true })
      address: string

  @Field(() => TokenEntity)
  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: "token_x_id" })
      tokenX: TokenEntity

  @Field(() => TokenEntity)
  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: "token_y_id" })
      tokenY: TokenEntity

  @Field(() => String)
  @Column({ name: "token_x_id" })
      tokenXId: string

  @Field(() => String)
  @Column({ name: "token_y_id" })
      tokenYId: string

  @Field({ nullable: true })
  @Column({ name: "fee_tier", nullable: true, type: "float" })
      feeTier?: number

  @Field({ name: "network", description: "Blockchain network" })
  @Column({ name: "network", default: Network.Testnet })
      network: Network

  @Field({ name: "chainKey", description: "Blockchain chain" })
  @Column({ name: "chain_key" })
      chainKey: ChainKey

  @Field(() => PoolTypeEnum, { nullable: true })
  @Column({
      name: "pool_type",
      type: "enum",
      enum: PoolTypeEnum,
      nullable: true,
  })
      poolType?: PoolTypeEnum

  @Field(() => String, { nullable: true})
  @Column({
      name: "router_address",
      nullable: true
  })
      routerAddress?: string

  @Field({ nullable: true })
  @Column({ name: "tick", nullable: true })
      tick?: string

  @Field({ nullable: true })
  @Column({ name: "response_pattern", type: "json", nullable: true })
      responsePattern?: ResponsePattern
}
