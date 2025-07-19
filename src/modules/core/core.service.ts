import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { MemDbService } from "../databases"

@Injectable()
export class CoreService implements OnModuleInit {
    private readonly logger = new Logger(CoreService.name)
    constructor(
    private readonly memDbService: MemDbService,
    ) {}

    async onModuleInit() {
    }
}
