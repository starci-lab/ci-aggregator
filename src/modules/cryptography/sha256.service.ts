import { Injectable } from "@nestjs/common"
import { createHash } from "crypto"

@Injectable()
export class Sha256Service {
    hash(data: string): string {
        return createHash("sha256").update(data).digest("hex")
    }
    verify(data: string, hash: string): boolean {
        return this.hash(data) === hash
    }
}