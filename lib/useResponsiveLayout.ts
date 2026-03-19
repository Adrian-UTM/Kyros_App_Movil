import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
    const { width, height } = useWindowDimensions();
    const shortestSide = Math.min(width, height);
    const isTablet = shortestSide >= 768;
    const isCompactPhone = width < 390;

    return {
        width,
        height,
        isTablet,
        isCompactPhone,
        contentMaxWidth: isTablet ? 1180 : 900,
        formMaxWidth: isTablet ? 820 : 720,
        modalMaxWidth: isTablet ? 760 : 720,
        screenPadding: isTablet ? 24 : 0,
        modalPadding: isTablet ? 32 : 20,
    };
}
