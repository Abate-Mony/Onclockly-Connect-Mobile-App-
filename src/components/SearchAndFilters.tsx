import { Search, X } from "lucide-react-native"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { StyledPressable as Pressable } from "./StyledPressable"
import { pressableFeedback } from "./interactiveStyles"
import { colors, radius, shadow } from "../utils/theme"

export interface FilterOption<T extends string> {
  label: string
  value: T
}

export function SearchAndFilters<T extends string>({
  label,
  placeholder,
  search,
  onSearchChange,
  options,
  selected,
  onSelect,
}: {
  label: string
  placeholder: string
  search: string
  onSearchChange: (value: string) => void
  options: readonly FilterOption<T>[]
  selected: T
  onSelect: (value: T) => void
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, shadow.sm]}>
        <Search size={17} color={colors.muted} />
        <TextInput
          accessibilityLabel={label}
          value={search}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          returnKeyType="search"
          style={styles.input}
        />
        {!!search && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onSearchChange("")}
            style={({ pressed }) => [styles.clearButton, pressableFeedback(pressed)]}
          >
            <X size={15} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        keyboardShouldPersistTaps="handled"
      >
        {options.map(option => {
          const active = option.value === selected
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.filter,
                active && styles.filterActive,
                pressableFeedback(pressed),
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, color: colors.ink, fontSize: 14, fontWeight: "500" },
  clearButton: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  filters: { gap: 8, paddingRight: 20 },
  filter: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: colors.white },
})
