import { Injectable } from "@nestjs/common"
import { IUpstreamOptions, UpstreamList } from "balancer-round-robin"

export interface CreateInstanceParams {
  list: Array<IUpstreamOptions>;
}

@Injectable()
export class WeightedRoundRobinService {
    createInstance({ list }: CreateInstanceParams): UpstreamList {
        const wrr = new UpstreamList()
        wrr.setList(list)
        return wrr
    }
}
