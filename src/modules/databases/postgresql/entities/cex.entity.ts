import { Column, Entity } from "typeorm"
import { AbstractEntity } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { RequestPattern, ResponsePattern } from "./types"

@ObjectType()
@Entity("cex")
export class CexEntity extends AbstractEntity {
    // Name of the CEX (e.g., "Binance", "OKX", "Bybit")
    @Field()
    @Column({ name: "name" })
        name: string

    // API endpoint used to fetch price data
    @Field()
    @Column({ name: "endpoint" })
        endpoint: string

    // Request pattern to call the API (method, headers, params, etc.)
    @Field(() => String)
    @Column({ name: "request_pattern", type: "json" })
        requestPattern: RequestPattern

    // Response pattern used to extract and format the price from the API response
    @Field(() => String)
    @Column({ name: "response_pattern", type: "json" })
        responsePattern: ResponsePattern
}