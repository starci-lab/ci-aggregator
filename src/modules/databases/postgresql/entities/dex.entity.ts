import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./abstract"
import { LiquidityPoolEntity } from "./liquiditiy-pool.entity"
import { Field, ObjectType } from "@nestjs/graphql"

@ObjectType()
@Entity("dex")
export class DexEntity extends AbstractEntity {
  @Field()
  @Column({ name: "name", unique: true })
      name: string

  @Field({ nullable: true })
  @Column({ name: "description", type: "text", nullable: true })
      description?: string

  @Field({ nullable: true })
  @Column({ name: "url", nullable: true })
      url?: string

  @Field(() => [LiquidityPoolEntity], { nullable: true })
  @OneToMany(() => LiquidityPoolEntity, (liquidityPool) => liquidityPool.dex)
      liquidityPools?: Array<LiquidityPoolEntity>
}