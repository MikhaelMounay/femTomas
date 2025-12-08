export const parseMemoryInit = (text: string): { success: boolean; memory?: Map<number, number>; errors?: string[] } => {
    const errors: string[] = [];
    const memory = new Map<number, number>();

    const lines = text.split("\n").map((line) => line.trim());

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.startsWith(";") || line.startsWith("//")) {
            continue; // Skip empty lines and comments
        }

        // Expected format: "address: value" or "address=value"
        const match = line.match(/^(\d+)\s*[:=]\s*(-?\d+)$/);
        if (!match) {
            errors.push(`Line ${i + 1}: Invalid format. Expected "address: value" or "address=value"`);
            continue;
        }

        const address = parseInt(match[1]);
        const value = parseInt(match[2]);

        // Validate address and value are 16-bit
        if (address < 0 || address > 0xffff) {
            errors.push(`Line ${i + 1}: Address ${address} out of range (0-65535)`);
            continue;
        }

        if (value < -32768 || value > 65535) {
            errors.push(`Line ${i + 1}: Value ${value} out of range (-32768 to 65535)`);
            continue;
        }

        // Convert to unsigned 16-bit if needed
        const unsignedValue = value < 0 ? value & 0xffff : value;
        memory.set(address, unsignedValue);
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, memory };
};
