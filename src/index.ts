import { demoProgram } from "./internal/tests/demoProgram";
import { CPU } from "./internal/cpu";

const cpu = new CPU();
cpu.loadProgram(demoProgram);
const result = cpu.run(10);

console.log("Simulation finished in cycles:", result.cycles);
console.log("Instruction timing (partial):");
for (const [instrId, t] of result.instrTiming.entries()) {
    console.log(instrId, t);
}
