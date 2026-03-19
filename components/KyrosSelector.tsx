import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useKyrosPalette } from '../lib/useKyrosPalette';
import { useResponsiveLayout } from '../lib/useResponsiveLayout';

interface Option {
    label: string;
    value: any;
}

interface KyrosSelectorProps {
    options: Option[];
    selectedValue: any | any[];
    onValueChange: (value: any) => void;
    placeholder?: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    style?: any;
    multiSelect?: boolean;
}

export default function KyrosSelector({ options, selectedValue, onValueChange, placeholder = "Seleccionar", icon, style, multiSelect = false }: KyrosSelectorProps) {
    const [visible, setVisible] = useState(false);
    const palette = useKyrosPalette();
    const responsive = useResponsiveLayout();

    const getDisplayText = () => {
        if (multiSelect) {
            if (!Array.isArray(selectedValue) || selectedValue.length === 0) return placeholder;
            if (selectedValue.length === 1) {
                const opt = options.find(o => o.value === selectedValue[0]);
                return opt ? opt.label : placeholder;
            }
            return `${selectedValue.length} seleccionados`;
        } else {
            const selectedOption = options.find(o => o.value === selectedValue);
            return selectedOption ? selectedOption.label : placeholder;
        }
    };

    const hasSelection = multiSelect ? (Array.isArray(selectedValue) && selectedValue.length > 0) : !!options.find(o => o.value === selectedValue);

    return (
        <>
            <TouchableOpacity 
                style={[styles.selectorBtn, {
                    backgroundColor: palette.surfaceRaised,
                    borderColor: palette.border,
                }, style]} 
                onPress={() => setVisible(true)}
                activeOpacity={0.8}
            >
                {icon && <MaterialIcons name={icon} size={20} color={palette.icon} style={{ marginRight: 8 }} />}
                <Text style={[styles.selectorText, { color: palette.text }, !hasSelection && { color: palette.textSoft }]} numberOfLines={1}>
                    {getDisplayText()}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={24} color={palette.icon} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <TouchableOpacity style={[styles.modalOverlay, styles.modalOverlayBase, responsive.isTablet ? styles.modalOverlayTablet : styles.modalOverlayPhone, { backgroundColor: palette.overlay }]} activeOpacity={1} onPress={() => setVisible(false)}>
                    <View style={[
                        styles.modalContent,
                        responsive.isTablet ? styles.modalContentTablet : styles.modalContentPhone,
                        {
                            backgroundColor: palette.background,
                            borderColor: palette.border,
                            width: '100%',
                            maxWidth: responsive.modalMaxWidth,
                            alignSelf: 'center',
                        }
                    ]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: palette.text }]}>{placeholder}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)} style={[styles.closeBtn, { backgroundColor: palette.surfaceRaised }]}>
                                <MaterialIcons name="close" size={24} color={palette.icon} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                            {options.map((opt, idx) => {
                                const isSelected = multiSelect 
                                    ? Array.isArray(selectedValue) && selectedValue.includes(opt.value)
                                    : opt.value === selectedValue;
                                
                                return (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={[styles.optionItem, { borderBottomColor: palette.border }, isSelected && [styles.optionItemSelected, { backgroundColor: palette.selectedBg }]]}
                                        onPress={() => {
                                            if (multiSelect) {
                                                const currentArray = Array.isArray(selectedValue) ? selectedValue : [];
                                                if (isSelected) {
                                                    onValueChange(currentArray.filter(v => v !== opt.value));
                                                } else {
                                                    onValueChange([...currentArray, opt.value]);
                                                }
                                            } else {
                                                onValueChange(opt.value);
                                                setVisible(false);
                                            }
                                        }}
                                    >
                                        <Text style={[styles.optionText, { color: palette.textMuted }, isSelected && [styles.optionTextSelected, { color: palette.primary }]]}>
                                            {opt.label}
                                        </Text>
                                        {isSelected && <MaterialIcons name={multiSelect ? "check-box" : "check"} size={20} color="#38bdf8" />}
                                        {!isSelected && multiSelect && <MaterialIcons name="check-box-outline-blank" size={20} color={palette.disabled} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {multiSelect && (
                            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: palette.primary }]} onPress={() => setVisible(false)}>
                                <Text style={styles.confirmBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    selectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectorText: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
    },
    modalOverlayBase: {
        padding: 16,
    },
    modalOverlayPhone: {
        justifyContent: 'flex-end',
    },
    modalOverlayTablet: {
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        padding: 24,
        maxHeight: '80%',
        borderWidth: 1,
    },
    modalContentPhone: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    modalContentTablet: {
        borderRadius: 28,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
        borderRadius: 20,
    },
    optionsList: {
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    optionItemSelected: {
        borderRadius: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 0,
        marginVertical: 4,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    optionTextSelected: {
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: '#38bdf8',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
