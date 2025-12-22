function ColorPicker({ label, value, onChange, disabled }) {
    return (
        <section>
            <label>{label}</label>

            <input
                type="color"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
        </section>
    );
}

export default ColorPicker;
