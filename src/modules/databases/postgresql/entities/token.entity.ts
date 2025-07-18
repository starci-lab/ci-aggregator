import { Column, Entity, OneToMany } from "typeorm"
import { AbstractEntity } from "./abstract"
import { Field, ObjectType, Float } from "@nestjs/graphql"
import { LiquidityPoolEntity } from "./liquiditiy-pool.entity"

@ObjectType()
@Entity("token")
export class TokenEntity extends AbstractEntity {
  @Field()
  @Column({ name: "symbol", unique: true })
      symbol: string

  @Field()
  @Column({ name: "name" })
      name: string

  @Field()
  @Column({ name: "address" })
      address: string

  @Field()
  @Column({ name: "chain" })
      chain: string

  @Field(() => Float)
  @Column("decimal", { name: "decimals", precision: 10, scale: 2, default: 6 })
      decimals: number

  @Field({ nullable: true })
  @Column({ name: "logo_url", nullable: true })
      logoUrl?: string

  @Field({ nullable: true })
  @Column({ name: "coingecko_id", nullable: true })
      coingeckoId?: string

  @Field(() => String, { nullable: true })
  @Column({ name: "total_supply", type: "numeric", nullable: true })
      totalSupply?: string

  @Field({ nullable: true })
  @Column({ name: "project_id", nullable: true })
      projectId?: string

  // Map qua pool
  @Field(() => [LiquidityPoolEntity], { nullable: true })
  @OneToMany(
      () => LiquidityPoolEntity,
      (liquiditiyPool) => liquiditiyPool.tokenX,
  )
      liquidityPoolsAsX?: Array<LiquidityPoolEntity>

  @Field(() => [LiquidityPoolEntity], { nullable: true })
  @OneToMany(
      () => LiquidityPoolEntity,
      (liquiditiyPool) => liquiditiyPool.tokenY,
  )
      liquidityPoolsAsY?: Array<LiquidityPoolEntity>
}
