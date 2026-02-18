import { PartialType } from "@nestjs/swagger";
import { CreateTrapDto } from "./create-trap.dto";

export class UpdateTrapDto extends PartialType(CreateTrapDto) {}
