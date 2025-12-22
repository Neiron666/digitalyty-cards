/**
 * Универсальный helper для обновления карточки
 * @param {Function} setCard - setState из useState
 * @param {string} section - ключ верхнего уровня (business, contact, content и т.д.)
 * @param {Object} value - обновляемые поля
 */
export function updateCardSection(setCard, section, value) {
    setCard((prev) => ({
        ...prev,
        [section]: {
            ...prev[section],
            ...value,
        },
        flags: (() => {
            const prevFlags = prev?.flags || {};
            if (prevFlags?.isTemplateSeeded !== true) return prevFlags;

            const seededMap = prevFlags?.seededMap || {};
            const keys = Object.keys(value || {});
            const didEditSeededField = keys.some((key) => {
                const path = `${section}.${key}`;
                if (!(path in seededMap)) return false;
                return value[key] !== seededMap[path];
            });

            if (!didEditSeededField) return prevFlags;

            return {
                ...prevFlags,
                isTemplateSeeded: false,
                seededMap: {},
            };
        })(),
    }));
}
