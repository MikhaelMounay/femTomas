function MemoryView({ memory }: { memory: Map<number, number> }) {
    const sortedEntries = Array.from(memory.entries()).sort((a, b) => a[0] - b[0]);

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-600">Memory</h2>
            {sortedEntries.length === 0 ? (
                <div className="text-sm text-gray-500">No memory locations in use</div>
            ) : (
                <div className="space-y-2">
                    {sortedEntries.map(([addr, value]) => (
                        <div
                            key={addr}
                            className="flex items-center justify-between rounded border border-gray-300 bg-gray-100 p-2"
                        >
                            <span className="text-sm text-gray-600">Addr {addr}</span>
                            <span className="font-mono text-lg text-green-700">{value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MemoryView;
