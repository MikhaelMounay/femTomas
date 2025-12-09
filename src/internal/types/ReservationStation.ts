// src/internal/types/ReservationStation.ts
import type { InstructionType } from "./InstructionType";

export interface ReservationStation {
    name: string;
    busy: boolean;
    op?: InstructionType;
    
    // Operands
    Vj?: number | null;
    Vk?: number | null;
    Qj?: number | null;          // ROB id providing operand
    Qk?: number | null;
    
    // Execution state
    _destROBId?: number | null;  // ROB entry id
    _instrId?: number | null;
    remaining?: number;          // cycles remaining for execution
    waitingForData?: boolean;    // for STORE: address ready, waiting for data
    
    // Instruction-specific data
    offset?: number;             // for LOAD/STORE/BEQ offset
    branchTarget?: number;       // for BEQ: computed branch target PC
    callTarget?: number;         // for CALL: target address
    returnAddress?: number;      // for CALL: return address (PC+1)
    
    // Computed results (before writing to ROB)
    computedValue?: number;      // result of computation
    storeAddress?: number;       // for STORE: computed address
    storeValue?: number;         // for STORE: value to store
    branchTaken?: boolean;       // for BEQ: was branch taken?
    mispredicted?: boolean;      // for BEQ: was prediction wrong?
}
