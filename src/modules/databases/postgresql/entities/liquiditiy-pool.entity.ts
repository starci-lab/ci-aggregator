import { Entity, Column, ManyToOne, JoinColumn } from "typeorm"
import { AbstractEntity } from "./abstract"
import { DexEntity } from "./dex.entity"
import { TokenEntity } from "./token.entity"
import { Field, ObjectType } from "@nestjs/graphql"
import { PoolTypeEnum, RequestPattern, ResponsePattern } from "./types"

@ObjectType()
@Entity("liquidity_pool")
export class LiquidityPoolEntity extends AbstractEntity {
  @Field(() => DexEntity)
  @ManyToOne(() => DexEntity, (dex) => dex.liquidityPools)
  @JoinColumn({ name: "dex_id" })
      dex: DexEntity

  @Field()
  @Column({ name: "pool_address" })
      poolAddress: string

  @Field(() => TokenEntity)
  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: "token_x_id" })
      tokenX: TokenEntity

  @Field(() => TokenEntity)
  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: "token_y_id" })
      tokenY: TokenEntity

  @Field({ nullable: true })
  @Column({ name: "fee_tier", nullable: true })
      feeTier?: string

  @Field(() => PoolTypeEnum, { nullable: true })
  @Column({
      name: "pool_type",
      type: "enum",
      enum: PoolTypeEnum,
      nullable: true,
  })
      poolType?: PoolTypeEnum

  @Field({ nullable: true })
  @Column({ name: "tick", nullable: true })
      tick?: string

  @Field({ nullable: true })
  @Column({ name: "method", nullable: true })
      method?: string

  @Field({ nullable: true })
  @Column({ name: "request_pattern", type: "json", nullable: true })
      requestPattern?: RequestPattern

  @Field({ nullable: true })
  @Column({ name: "response_pattern", type: "json", nullable: true })
      responsePattern?: ResponsePattern
}