import { useMemo, useState } from "react";
import Section from "./Section";
import { WorkHoursIcon } from "../../icons/EditorTabIcons";
import styles from "./BusinessHoursSection.module.css";

const WEEKDAYS = [
    { key: "sun", label: "ראשון" },
    { key: "mon", label: "שני" },
    { key: "tue", label: "שלישי" },
    { key: "wed", label: "רביעי" },
    { key: "thu", label: "חמישי" },
    { key: "fri", label: "שישי" },
    { key: "sat", label: "שבת" },
];

function toMinutes(hhmm) {
    if (typeof hhmm !== "string") return null;
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeBusinessHours(card) {
    const bh =
        card?.businessHours && typeof card.businessHours === "object"
            ? card.businessHours
            : null;
    if (!bh || bh.enabled !== true) return null;

    const week = bh.week && typeof bh.week === "object" ? bh.week : null;
    if (!week) return null;

    const days = [];

    for (const d of WEEKDAYS) {
        const rawDay =
            week?.[d.key] && typeof week[d.key] === "object" ? week[d.key] : {};
        const open = rawDay.open === true;

        const rawIntervals = Array.isArray(rawDay.intervals)
            ? rawDay.intervals
            : [];

        const intervals = rawIntervals
            .map((it) => {
                const start = typeof it?.start === "string" ? it.start : "";
                const end = typeof it?.end === "string" ? it.end : "";
                const startM = toMinutes(start);
                const endM = toMinutes(end);
                if (startM === null || endM === null) return null;
                if (startM >= endM) return null;
                return { start, end, startM };
            })
            .filter(Boolean)
            .sort((a, b) => a.startM - b.startM);

        if (!open || intervals.length === 0) {
            days.push({
                key: d.key,
                label: d.label,
                closed: true,
                intervals: [],
            });
        } else {
            days.push({ key: d.key, label: d.label, closed: false, intervals });
        }
    }

    const meaningful = days.some(
        (d) => d.closed === false && d.intervals.length,
    );
    if (!meaningful) return null;

    return {
        title: "שעות פעילות",
        days,
    };
}

export default function BusinessHoursSection({ card, mode }) {
    const data = useMemo(() => normalizeBusinessHours(card), [card]);
    const initialOpen = false;
    const [open, setOpen] = useState(initialOpen);

    // Defense-in-depth: respect entitlement even if data leaked through.
    if (!card?.entitlements?.canUseBusinessHours) return null;
    if (!data) return null;

    return (
        <Section
            id="business-hours"
            className={styles.section}
            contentClassName={styles.content}
        >
            <div className={styles.wrap}>
                <h2 className={styles.sectionTitle}>{data.title}</h2>
                <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    <WorkHoursIcon className={styles.tabIcon} />
                    <span className={styles.toggleText}>
                        {open ? "הסתר שעות פעילות" : "הצג שעות פעילות"}
                    </span>
                    <span className={styles.icon} aria-hidden="true" />
                </button>

                {open ? (
                    <div className={styles.table}>
                        {data.days.map((d) => (
                            <div key={d.key} className={styles.row}>
                                <div className={styles.day}>{d.label}</div>
                                <div className={styles.hours}>
                                    {d.closed ? (
                                        <span className={styles.closed}>
                                            סגור
                                        </span>
                                    ) : (
                                        <span className={styles.ranges}>
                                            {d.intervals
                                                .map(
                                                    (it) =>
                                                        `${it.start}–${it.end}`,
                                                )
                                                .join(", ")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </Section>
    );
}
