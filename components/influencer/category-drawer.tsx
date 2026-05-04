import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import type { CategoryDto, GenderGroup, SubCategoryDto } from '@/features/influencer/product-api';

const P = '#8D73FF';
const SCREEN_W = Dimensions.get('window').width;
const PANEL_W = Math.min(SCREEN_W * 0.86, 360);

export type CategorySelection = {
  categoryId: number;
  categoryName: string;
  gender: string | null;
};

type DrillNode = {
  id: number;
  name: string;
  slug: string;
  catalogCount: number;
  items: SubCategoryDto[];
  genderGroups?: GenderGroup[];
  /** Bir önceki seviyeden inherit edilen cinsiyet (drill-down boyunca taşınır). */
  inheritedGender?: string | null;
};

export function CategoryDrawer({
  visible,
  categories,
  onClose,
  onSelect,
}: {
  visible: boolean;
  categories: CategoryDto[];
  onClose: () => void;
  onSelect: (selection: CategorySelection) => void;
}) {
  const tx = useRef(new Animated.Value(-PANEL_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [stack, setStack] = useState<DrillNode[]>([]);
  const [mounted, setMounted] = useState(visible);
  const currentNode = stack.length > 0 ? stack[stack.length - 1] : null;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(tx, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(tx, { toValue: -PANEL_W, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setStack([]);
        setMounted(false);
      });
    }
  }, [visible, tx, fade]);

  if (!mounted) return null;

  const pushMain = (cat: CategoryDto) => {
    const subItems = cat.subCategories ?? [];
    const groups = (cat.genderGroups ?? []).filter((g) => (g.items ?? []).length > 0);
    if (subItems.length === 0 && groups.length === 0) {
      onSelect({ categoryId: cat.id, categoryName: cat.name, gender: null });
      return;
    }
    setStack([
      {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        catalogCount: cat.catalogCount,
        items: subItems,
        genderGroups: groups,
        inheritedGender: null,
      },
    ]);
  };

  const pushSub = (sub: SubCategoryDto, inheritedGender: string | null) => {
    const effectiveGender = sub.genderLabel ?? inheritedGender ?? null;
    const children = sub.children ?? [];
    if (children.length === 0) {
      onSelect({ categoryId: sub.id, categoryName: sub.name, gender: effectiveGender });
      return;
    }
    setStack((prev) => [
      ...prev,
      {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        catalogCount: sub.catalogCount,
        items: children,
        inheritedGender: effectiveGender,
      },
    ]);
  };

  const goBack = () => setStack((prev) => prev.slice(0, -1));

  const selectCurrent = () => {
    if (!currentNode) return;
    onSelect({
      categoryId: currentNode.id,
      categoryName: currentNode.name,
      gender: currentNode.inheritedGender ?? null,
    });
  };

  return (
    <View style={s.root} pointerEvents="box-none">
      <Animated.View style={[s.backdrop, { opacity: fade }]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[s.panel, { transform: [{ translateX: tx }] }]}>
        <View style={s.header}>
          {currentNode ? (
            <Pressable onPress={goBack} style={s.headerBackBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={P} />
              <AppText style={s.headerBackText} numberOfLines={1}>
                {stack.length > 1 ? stack[stack.length - 2].name : 'Kategoriler'}
              </AppText>
            </Pressable>
          ) : (
            <View style={s.headerTitleRow}>
              <Ionicons name="grid" size={18} color={P} />
              <AppText style={s.headerTitle}>Kategoriler</AppText>
            </View>
          )}
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={20} color="#3D3660" />
          </Pressable>
        </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {currentNode === null ? (
              // ─── ROOT: Ana kategoriler ──
              categories.map((cat) => {
                const hasChildren =
                  (cat.subCategories?.length ?? 0) > 0 ||
                  (cat.genderGroups?.length ?? 0) > 0;
                return (
                  <Pressable key={cat.id} style={s.row} onPress={() => pushMain(cat)}>
                    <AppText style={s.rowText} numberOfLines={1}>
                      {cat.name}
                    </AppText>
                    <Ionicons
                      name={hasChildren ? 'chevron-forward' : 'arrow-up-outline'}
                      size={16}
                      color="#9A96B5"
                    />
                  </Pressable>
                );
              })
            ) : (
              // ─── DRILL: Alt kategoriler ──
              <>
                <Pressable style={s.heroBtn} onPress={selectCurrent}>
                  <View>
                    <AppText style={s.heroTitle}>{currentNode.name}</AppText>
                    <AppText style={s.heroSubtitle}>Bu kategoriden tümünü göster</AppText>
                  </View>
                  <View style={s.heroChip}>
                    <AppText style={s.heroChipText}>Tümü</AppText>
                    <Ionicons name="arrow-forward" size={11} color="#FFFFFF" />
                  </View>
                </Pressable>

                {/* Cinsiyet grupları (varsa) */}
                {currentNode.genderGroups?.map((group) => (
                  <View key={group.label} style={s.groupBlock}>
                    <View style={s.groupHeader}>
                      <View style={s.groupHeaderDot} />
                      <AppText style={s.groupHeaderText}>{group.label}</AppText>
                    </View>
                    {group.items.map((sub) => {
                      const hasChildren = (sub.children?.length ?? 0) > 0;
                      return (
                        <Pressable
                          key={`${group.label}-${sub.id}`}
                          style={s.row}
                          onPress={() => pushSub(sub, group.label)}
                        >
                          <AppText style={s.rowText} numberOfLines={1}>
                            {sub.name}
                          </AppText>
                          <Ionicons
                            name={hasChildren ? 'chevron-forward' : 'arrow-up-outline'}
                            size={16}
                            color="#9A96B5"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}

                {/* Düz alt kategoriler (gender atanmamış) */}
                {currentNode.items.length > 0 && (
                  <View style={s.groupBlock}>
                    {currentNode.genderGroups && currentNode.genderGroups.length > 0 && (
                      <View style={s.groupHeader}>
                        <View style={s.groupHeaderDot} />
                        <AppText style={s.groupHeaderText}>Tümü</AppText>
                      </View>
                    )}
                    {currentNode.items.map((sub) => {
                      const hasChildren = (sub.children?.length ?? 0) > 0;
                      return (
                        <Pressable
                          key={sub.id}
                          style={s.row}
                          onPress={() => pushSub(sub, currentNode.inheritedGender ?? null)}
                        >
                          <AppText style={s.rowText} numberOfLines={1}>
                            {sub.name}
                          </AppText>
                          <Ionicons
                            name={hasChildren ? 'chevron-forward' : 'arrow-up-outline'}
                            size={16}
                            color="#9A96B5"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PANEL_W,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEFF',
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1631',
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: 4,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '800',
    color: P,
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6FB',
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4FA',
  },
  rowText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1631',
    flex: 1,
    marginRight: 10,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0EEFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1631',
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#6B6883',
    marginTop: 2,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  groupBlock: {
    marginTop: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4FA',
    marginBottom: 4,
  },
  groupHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P,
  },
  groupHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A96B5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
