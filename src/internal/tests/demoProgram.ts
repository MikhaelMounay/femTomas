import type { Instruction } from "../types/Instruction";
import { InstructionType } from "../types/InstructionType";

export const demoProgram: Instruction[] = [
    { _id: 1, type: InstructionType.LOAD, dest: 2, src1: 1, offset: 0, _text: "LOAD R2, 0(R1)" },
    { _id: 2, type: InstructionType.ADD, dest: 3, src1: 2, src2: 4, _text: "ADD R3, R2, R4" },
    { _id: 3, type: InstructionType.MUL, dest: 5, src1: 3, src2: 6, _text: "MUL R5, R3, R6" },
    { _id: 4, type: InstructionType.STORE, src1: 5, src2: 1, offset: 4, _text: "STORE R5, 4(R1)" },
];
