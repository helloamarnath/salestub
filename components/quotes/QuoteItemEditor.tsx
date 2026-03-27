import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { getProducts } from '@/lib/api/products';
import type { Product } from '@/types/product';
import type { CreateQuoteItemDto } from '@/types/quote';

const GST_RATES = [0, 5, 12, 18, 28];

interface QuoteItemEditorProps {
  items: CreateQuoteItemDto[];
  onItemsChange: (items: CreateQuoteItemDto[]) => void;
  accessToken: string | null;
  isDark: boolean;
  readOnly?: boolean;
}

export function QuoteItemEditor({
  items,
  onItemsChange,
  accessToken,
  isDark,
  readOnly = false,
}: QuoteItemEditorProps) {
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState<number>(-1);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const addItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newItem: CreateQuoteItemDto = {
      name: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      discount: 0,
      sortOrder: items.length,
      unit: 'pcs',
      hsnCode: '',
    };
    onItemsChange([...items, newItem]);
    setExpandedIndex(items.length);
  };

  const removeItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = items.filter((_, i) => i !== index);
    onItemsChange(updated);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateItem = (index: number, field: keyof CreateQuoteItemDto, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onItemsChange(updated);
  };

  const calcItemTotal = (item: CreateQuoteItemDto) => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const discount = item.discount || 0;
    const taxRate = item.taxRate || 0;
    const subtotal = qty * price - discount;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  };

  // Product search
  const searchProducts = useCallback(
    async (query: string) => {
      if (!accessToken) return;
      setLoadingProducts(true);
      const res = await getProducts(accessToken, { search: query, limit: 15 });
      if (res.success && res.data) {
        setProducts(res.data.data || []);
      }
      setLoadingProducts(false);
    },
    [accessToken]
  );

  const openProductPicker = (index: number) => {
    setProductModalIndex(index);
    setProductSearch('');
    setProducts([]);
    setProductModalVisible(true);
    searchProducts('');
  };

  const selectProduct = (product: Product) => {
    const updated = [...items];
    const price = product.price
      ? typeof product.price === 'string'
        ? parseFloat(product.price)
        : product.price
      : 0;
    const productAny = product as any;
    updated[productModalIndex] = {
      ...updated[productModalIndex],
      productId: product.id,
      name: product.name,
      sku: product.sku || '',
      unitPrice: price,
      taxRate: productAny.taxRate
        ? typeof productAny.taxRate === 'string'
          ? parseFloat(productAny.taxRate)
          : productAny.taxRate
        : updated[productModalIndex].taxRate || 18,
      unit: productAny.unit || updated[productModalIndex].unit || 'pcs',
      hsnCode: productAny.hsnCode || updated[productModalIndex].hsnCode || '',
      description: product.description || '',
    };
    onItemsChange(updated);
    setProductModalVisible(false);
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const totalAmount = items.reduce((sum, item) => sum + calcItemTotal(item), 0);

  return (
    <View>
      {/* Items */}
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const itemTotal = calcItemTotal(item);

        return (
          <View key={index} style={[styles.itemCard, { backgroundColor: cardBg, borderColor }]}>
            {/* Header - always visible */}
            <TouchableOpacity
              style={styles.itemHeader}
              onPress={() => {
                if (readOnly) return;
                setExpandedIndex(isExpanded ? null : index);
              }}
              activeOpacity={readOnly ? 1 : 0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemIndex, { color: subtitleColor }]}>Item {index + 1}</Text>
                <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>
                  {item.name || 'Untitled Item'}
                </Text>
                <Text style={[styles.itemMeta, { color: subtitleColor }]}>
                  {item.quantity} {item.unit || 'pcs'} × ₹{((item.unitPrice || 0) / 100).toFixed(2)}
                  {(item.taxRate || 0) > 0 ? ` · ${item.taxRate}% tax` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemTotal, { color: textColor }]}>{formatAmount(itemTotal)}</Text>
                {!readOnly && (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={subtitleColor}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded editor */}
            {isExpanded && !readOnly && (
              <View style={[styles.itemBody, { borderTopColor: borderColor }]}>
                {/* Product selector */}
                <TouchableOpacity
                  style={[styles.productBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
                  onPress={() => openProductPicker(index)}
                >
                  <Ionicons name="search" size={16} color={subtitleColor} />
                  <Text style={[styles.productBtnText, { color: item.productId ? textColor : subtitleColor }]}>
                    {item.productId ? 'Change Product' : 'Search Products'}
                  </Text>
                </TouchableOpacity>

                {/* Name */}
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Name *</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                    value={item.name}
                    onChangeText={(v) => updateItem(index, 'name', v)}
                    placeholder="Item name"
                    placeholderTextColor={subtitleColor}
                  />
                </View>

                {/* Description */}
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Description</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                    value={item.description || ''}
                    onChangeText={(v) => updateItem(index, 'description', v)}
                    placeholder="Optional description"
                    placeholderTextColor={subtitleColor}
                  />
                </View>

                {/* Qty + Unit Price row */}
                <View style={styles.twoCol}>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Qty</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItem(index, 'quantity', v === '' ? 0 : parseFloat(v))}
                      keyboardType="numeric"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Unit Price (paise)</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={String(item.unitPrice)}
                      onChangeText={(v) => updateItem(index, 'unitPrice', v === '' ? 0 : parseFloat(v))}
                      keyboardType="numeric"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                </View>

                {/* Tax Rate */}
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Tax Rate (%)</Text>
                  <View style={styles.taxRateRow}>
                    {GST_RATES.map((rate) => (
                      <TouchableOpacity
                        key={rate}
                        style={[
                          styles.taxRateBtn,
                          {
                            backgroundColor: item.taxRate === rate ? '#3b82f6' : inputBg,
                            borderColor: item.taxRate === rate ? '#3b82f6' : inputBorder,
                          },
                        ]}
                        onPress={() => updateItem(index, 'taxRate', rate)}
                      >
                        <Text style={[styles.taxRateBtnText, { color: item.taxRate === rate ? 'white' : textColor }]}>
                          {rate}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Discount + Unit row */}
                <View style={styles.twoCol}>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Discount (paise)</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={String(item.discount || 0)}
                      onChangeText={(v) => updateItem(index, 'discount', v === '' ? 0 : parseFloat(v))}
                      keyboardType="numeric"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Unit</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={item.unit || ''}
                      onChangeText={(v) => updateItem(index, 'unit', v)}
                      placeholder="pcs, kg, hrs"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                </View>

                {/* HSN + SKU row */}
                <View style={styles.twoCol}>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>HSN/SAC Code</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={item.hsnCode || ''}
                      onChangeText={(v) => updateItem(index, 'hsnCode', v)}
                      placeholder="e.g. 8471"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                  <View style={[styles.fieldRow, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>SKU</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                      value={item.sku || ''}
                      onChangeText={(v) => updateItem(index, 'sku', v)}
                      placeholder="Product SKU"
                      placeholderTextColor={subtitleColor}
                    />
                  </View>
                </View>

                {/* Remove */}
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(index)}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={styles.removeBtnText}>Remove Item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Add Item button */}
      {!readOnly && (
        <TouchableOpacity style={[styles.addItemBtn, { borderColor }]} onPress={addItem}>
          <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.addItemBtnText}>Add Item</Text>
        </TouchableOpacity>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <View style={[styles.totalsBox, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: subtitleColor }]}>
              Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})
            </Text>
            <Text style={[styles.totalValue, { color: textColor }]}>
              {formatAmount(items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0) - (i.discount || 0), 0))}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: subtitleColor }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: subtitleColor }]}>
              {formatAmount(
                items.reduce((s, i) => {
                  const sub = (i.quantity || 0) * (i.unitPrice || 0) - (i.discount || 0);
                  return s + sub * ((i.taxRate || 0) / 100);
                }, 0)
              )}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow, { borderTopColor: borderColor }]}>
            <Text style={[styles.grandTotalLabel, { color: textColor }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: '#3b82f6' }]}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <View style={[styles.emptyItems, { borderColor }]}>
          <Ionicons name="cube-outline" size={40} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} />
          <Text style={[styles.emptyItemsText, { color: subtitleColor }]}>No items added</Text>
          {!readOnly && (
            <Text style={[styles.emptyItemsHint, { color: subtitleColor }]}>
              Tap "Add Item" to get started
            </Text>
          )}
        </View>
      )}

      {/* Product Search Modal */}
      <Modal visible={productModalVisible} transparent animationType="slide" onRequestClose={() => setProductModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : 'white' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Select Product</Text>
              <TouchableOpacity onPress={() => setProductModalVisible(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearch, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="search" size={18} color={subtitleColor} />
              <TextInput
                style={[styles.modalSearchInput, { color: textColor }]}
                value={productSearch}
                onChangeText={(v) => {
                  setProductSearch(v);
                  searchProducts(v);
                }}
                placeholder="Search products..."
                placeholderTextColor={subtitleColor}
                autoFocus
              />
            </View>

            {loadingProducts ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={products}
                keyExtractor={(p) => p.id}
                renderItem={({ item: product }) => (
                  <TouchableOpacity
                    style={[styles.productItem, { borderBottomColor: borderColor }]}
                    onPress={() => selectProduct(product)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: textColor }]}>{product.name}</Text>
                      <Text style={[styles.productSku, { color: subtitleColor }]}>
                        {product.sku ? `SKU: ${product.sku}` : ''}
                        {product.price ? ` · ₹${(Number(product.price) / 100).toFixed(2)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[styles.noProducts, { color: subtitleColor }]}>No products found</Text>
                }
                style={{ maxHeight: 350 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  itemIndex: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemName: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '700' },
  itemBody: { padding: 14, borderTopWidth: 1, gap: 10 },
  productBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  productBtnText: { fontSize: 13, fontWeight: '500' },
  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '500' },
  fieldInput: {
    fontSize: 14,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  taxRateRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  taxRateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  taxRateBtnText: { fontSize: 13, fontWeight: '600' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 6 },
  removeBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  addItemBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  totalsBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: '500' },
  grandTotalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 15, fontWeight: '700' },
  grandTotalValue: { fontSize: 17, fontWeight: '800' },
  emptyItems: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 14,
    gap: 6,
  },
  emptyItemsText: { fontSize: 14, fontWeight: '500' },
  emptyItemsHint: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 15 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  productName: { fontSize: 14, fontWeight: '600' },
  productSku: { fontSize: 12, marginTop: 2 },
  noProducts: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
