function RegisterFileView({ registers }: { registers: number[] }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-600">Register File</h2>
            <div className="grid grid-cols-4 gap-3">
                {registers.map((value, idx) => (
                    <div key={idx} className="rounded border border-gray-300 bg-gray-100 p-2">
                        <div className="text-xs text-gray-600">R{idx}</div>
                        <div className="font-mono text-lg text-green-700">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RegisterFileView;
