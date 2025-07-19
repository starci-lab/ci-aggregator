import { Injectable } from "@nestjs/common"
import WRR from "weighted-round-robin"

export interface WeightedRoundRobin<T = string> {
    add(value: T, weight: number): void;
    next(): T;
}

export interface ValueWeight<T=string> {
    value: T
    weight: number
}

export interface CreateInstanceParams<T> {
    valueWeights: Array<ValueWeight<T>>
}

@Injectable()
export class WeightedRoundRobinService {
    createInstance<T>({
        valueWeights,
    }: CreateInstanceParams<T>): WeightedRoundRobin<T> {
        const wrr = WRR()
        valueWeights.forEach(({ value, weight }) => {
            wrr.add(value, weight)
        })
        return wrr
    }
}