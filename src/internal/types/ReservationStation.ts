import type { InstructionType } from "./InstructionType";

export interface ReservationStation {
    name: string;
    busy: boolean;
    op?: InstructionType;
    Vj?: number | null;
    Vk?: number | null;
    Qj?: number | null;             // ROB id providing operand
    Qk?: number | null;
    offset?: number;                // for LOAD/STORE offset value
    _destROBId?: number | null;     // ROB entry id
    _instrId?: number | null;
    remaining?: number;             // cycles remaining for execution
}
