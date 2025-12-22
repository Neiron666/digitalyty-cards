const fonts = [
    { value: "Heebo, sans-serif", label: "Heebo" },
    { value: "Rubik, sans-serif", label: "Rubik" },
    { value: "Arial, sans-serif", label: "Arial" },
];

function FontPicker({ value, onChange, disabled }) {
    return (
        <section>
            <label>גופן</label>

            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            >
                {fonts.map((font) => (
                    <option key={font.value} value={font.value}>
                        {font.label}
                    </option>
                ))}
            </select>
        </section>
    );
}

export default FontPicker;
