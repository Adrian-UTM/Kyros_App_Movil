export const getLocalToday = (): string => {
    // Returns YYYY-MM-DD in local time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatDateTitle = (dateString: string): string => {
    // Formats YYYY-MM-DD to "Jueves, 5 de Febrero"
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

export const getStartOfDayLocal = (dateString: string): string => {
    // Return UTC equivalent of local start of day (e.g., 2026-03-05T06:00:00.000Z for Mexico)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0);
    return date.toISOString();
};

export const getEndOfDayLocal = (dateString: string): string => {
    // Return UTC equivalent of local end of day
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 23, 59, 59, 999);
    return date.toISOString();
};

export const isTimeOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean => {
    return startA < endB && endA > startB;
};
