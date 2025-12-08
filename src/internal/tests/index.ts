import { demoProgram } from "./demoProgram";
import { CPU } from "../cpu";

const cpu = new CPU();
cpu.loadProgram(demoProgram);
// example memory contents
cpu.loadMemory(
    new Map([
        [0, 10],
        [4, 20],
        [8, 30],
    ])
);
const result = cpu.run(50);

console.log("Simulation finished in cycles:", result.cycles);
console.log("Instruction timing (partial):");
for (const [instrId, t] of result.instrTiming.entries()) {
    console.log(instrId, t);
}
