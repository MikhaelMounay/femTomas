import type { InstructionType } from "./InstructionType";
import type { Register } from "./Register";

export interface Instruction {
    _id: number;             // unique sequential id for tracking
    _text?: string;          // original text (for debug)
    type: InstructionType;
    dest?: Register;        // rA
    src1?: Register;        // rB
    src2?: Register;        // rC or offset encoded differently
    offset?: number;        // for load/store/branch
    label?: number;         // for call
}
