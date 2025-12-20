import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  getProduct,
  createProduct,
  updateProduct,
  getProductCategories,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/api/products';
import type { Product, ProductCategory, ProductImage, CreateProductDto, UpdateProductDto } from '@/types/product';
import { formatPriceForInput, parsePriceFromInput } from '@/types/product';

// Form section header
function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <Text style={[styles.sectionHeader, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
      {title}
    </Text>
  );
}

// Form input field
function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  error,
  required,
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  error?: string;
  required?: boolean;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: inputBg, borderColor: error ? '#ef4444' : inputBorder }
      ]}>
        <TextInput
          style={[styles.input, { color: textColor }, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Category picker
function CategoryPicker({
  value,
  categories,
  onChange,
  loading,
  isDark,
}: {
  value: string | undefined;
  categories: ProductCategory[];
  onChange: (categoryId: string | undefined) => void;
  loading: boolean;
  isDark: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const selectedCategory = categories.find((c) => c.id === value);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
        Category
      </Text>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors[isDark ? 'dark' : 'light'].primary} />
        ) : selectedCategory ? (
          <Text style={[styles.pickerButtonText, { color: textColor }]}>{selectedCategory.name}</Text>
        ) : (
          <Text style={[styles.pickerPlaceholder, { color: placeholderColor }]}>Select category...</Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={placeholderColor}
        />
      </TouchableOpacity>

      {expanded && !loading && (
        <View style={[styles.pickerList, { backgroundColor: inputBg }]}>
          <TouchableOpacity
            style={[styles.pickerOption, { borderBottomColor: inputBorder }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(undefined);
              setExpanded(false);
            }}
          >
            <Text style={[styles.pickerOptionText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
              None
            </Text>
            {!value && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.pickerOption,
                { borderBottomColor: inputBorder },
                value === category.id && styles.pickerOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(category.id);
                setExpanded(false);
              }}
            >
              <Text style={[
                styles.pickerOptionText,
                { color: textColor },
                value === category.id && styles.pickerOptionTextSelected,
              ]}>
                {category.name}
              </Text>
              {value === category.id && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Active toggle
function ActiveToggle({
  value,
  onChange,
  isDark,
}: {
  value: boolean;
  onChange: (val: boolean) => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.inputContainer}>
      <View style={[styles.toggleContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
        <View style={styles.toggleInfo}>
          <Ionicons
            name={value ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={value ? '#22c55e' : '#ef4444'}
          />
          <View style={styles.toggleText}>
            <Text style={[styles.toggleLabel, { color: textColor }]}>Active</Text>
            <Text style={[styles.toggleDescription, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
              {value ? 'Product is visible to users' : 'Product is hidden from users'}
            </Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(val);
          }}
          trackColor={{ false: '#767577', true: '#22c55e' }}
          thumbColor="white"
          ios_backgroundColor="#767577"
        />
      </View>
    </View>
  );
}

// Pending image type (not yet uploaded)
interface PendingImage {
  uri: string;
  name: string;
  type: string;
}

// Image picker section
function ImagePickerSection({
  pendingImages,
  existingImages,
  onAddImage,
  onRemovePendingImage,
  onRemoveExistingImage,
  isDark,
  uploading,
}: {
  pendingImages: PendingImage[];
  existingImages: ProductImage[];
  onAddImage: () => void;
  onRemovePendingImage: (index: number) => void;
  onRemoveExistingImage: (imageId: string) => void;
  isDark: boolean;
  uploading: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const totalImages = pendingImages.length + existingImages.length;

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
        Images {totalImages > 0 && `(${totalImages})`}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imagesScroll}
        contentContainerStyle={styles.imagesContainer}
      >
        {/* Add Image Button */}
        <TouchableOpacity
          style={[styles.addImageButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
          onPress={onAddImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color={subtitleColor} />
              <Text style={[styles.addImageText, { color: subtitleColor }]}>Add</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Existing Images (from server) */}
        {existingImages.map((image) => (
          <View key={image.id} style={styles.imageItem}>
            <Image
              source={{ uri: image.thumbnailUrl || image.imageUrl }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {image.isPrimary && (
              <View style={styles.primaryBadge}>
                <Ionicons name="star" size={10} color="white" />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  'Remove Image',
                  'Are you sure you want to remove this image?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => onRemoveExistingImage(image.id) },
                  ]
                );
              }}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Pending Images (to be uploaded) */}
        {pendingImages.map((image, index) => (
          <View key={`pending-${index}`} style={styles.imageItem}>
            <Image
              source={{ uri: image.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>New</Text>
            </View>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemovePendingImage(index);
              }}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.imageHint, { color: subtitleColor }]}>
        Tap to add product images. First image will be the primary.
      </Text>
    </View>
  );
}

export default function CreateProductScreen() {
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isEditing = !!editId;

  // Theme colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Image state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Data state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!accessToken) return;
      setLoadingCategories(true);
      const response = await getProductCategories(accessToken);
      if (response.success && response.data) {
        setCategories(response.data);
      }
      setLoadingCategories(false);
    };
    fetchCategories();
  }, [accessToken]);

  // Load existing product for editing
  useEffect(() => {
    if (!isEditing || !accessToken || !editId) return;

    const fetchProduct = async () => {
      setLoadingProduct(true);
      const response = await getProduct(accessToken, editId);
      if (response.success && response.data) {
        const product = response.data;
        setName(product.name);
        setSku(product.sku || '');
        setCategoryId(product.categoryId);
        setPrice(formatPriceForInput(product.price));
        setDescription(product.description || '');
        setIsActive(product.isActive);
        // Set existing images
        if (product.images && product.images.length > 0) {
          setExistingImages(product.images);
        }
      } else {
        Alert.alert('Error', 'Failed to load product');
        router.back();
      }
      setLoadingProduct(false);
    };

    fetchProduct();
  }, [isEditing, editId, accessToken]);

  // Pick image from library or camera
  const handleAddImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Show options
    Alert.alert(
      'Add Image',
      'Choose a source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Camera access is needed to take photos.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const fileName = asset.uri.split('/').pop() || 'photo.jpg';
              const fileType = asset.mimeType || 'image/jpeg';
              setPendingImages((prev) => [...prev, { uri: asset.uri, name: fileName, type: fileType }]);
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Required', 'Photo library access is needed to select images.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const fileName = asset.uri.split('/').pop() || 'photo.jpg';
              const fileType = asset.mimeType || 'image/jpeg';
              setPendingImages((prev) => [...prev, { uri: asset.uri, name: fileName, type: fileType }]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Remove pending image
  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing image
  const handleRemoveExistingImage = async (imageId: string) => {
    if (!accessToken || !editId) return;

    const response = await deleteProductImage(accessToken, editId, imageId);
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to delete image');
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (price && isNaN(Number(price))) {
      newErrors.price = 'Price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload pending images to product
  const uploadPendingImages = async (productId: string) => {
    if (pendingImages.length === 0) return;

    setUploadingImages(true);

    for (let i = 0; i < pendingImages.length; i++) {
      const image = pendingImages[i];
      const isPrimary = existingImages.length === 0 && i === 0; // First image is primary if no existing

      await uploadProductImage(accessToken, productId, image, { isPrimary });
    }

    setUploadingImages(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const productData: CreateProductDto | UpdateProductDto = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      categoryId: categoryId || undefined,
      price: price ? parsePriceFromInput(price) : undefined,
      description: description.trim() || undefined,
      isActive,
    };

    const response = isEditing
      ? await updateProduct(accessToken, editId!, productData as UpdateProductDto)
      : await createProduct(accessToken, productData as CreateProductDto);

    if (response.success && response.data) {
      // Upload pending images
      if (pendingImages.length > 0) {
        await uploadPendingImages(response.data.id);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to save product');
    }

    setLoading(false);
  };

  // Handle back
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if form has data
    const hasData = name || sku || price || description || pendingImages.length > 0;

    if (hasData) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // Loading state
  if (loadingProduct) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[resolvedTheme].primary} />
          <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
            Loading product...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: borderColor }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={handleBack}
            >
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {isEditing ? 'Edit Product' : 'New Product'}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, (loading || uploadingImages) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading || uploadingImages}
            >
              {loading || uploadingImages ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Images Section */}
          <SectionHeader title="Images" isDark={isDark} />

          <ImagePickerSection
            pendingImages={pendingImages}
            existingImages={existingImages}
            onAddImage={handleAddImage}
            onRemovePendingImage={handleRemovePendingImage}
            onRemoveExistingImage={handleRemoveExistingImage}
            isDark={isDark}
            uploading={uploadingImages}
          />

          {/* Basic Info Section */}
          <SectionHeader title="Basic Information" isDark={isDark} />

          <FormInput
            label="Product Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g., Premium Widget"
            error={errors.name}
            required
            isDark={isDark}
          />

          <FormInput
            label="SKU"
            value={sku}
            onChangeText={setSku}
            placeholder="e.g., WIDGET-001"
            isDark={isDark}
          />

          <CategoryPicker
            value={categoryId}
            categories={categories}
            onChange={setCategoryId}
            loading={loadingCategories}
            isDark={isDark}
          />

          {/* Pricing Section */}
          <SectionHeader title="Pricing" isDark={isDark} />

          <FormInput
            label="Price"
            value={price}
            onChangeText={(text) => {
              // Allow only numbers and decimal point
              const cleaned = text.replace(/[^0-9.]/g, '');
              // Prevent multiple decimal points
              const parts = cleaned.split('.');
              const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
              setPrice(formatted);
              if (errors.price) setErrors({ ...errors, price: '' });
            }}
            placeholder="e.g., 999.00"
            keyboardType="decimal-pad"
            error={errors.price}
            isDark={isDark}
          />

          {/* Details Section */}
          <SectionHeader title="Details" isDark={isDark} />

          <FormInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Add product description..."
            multiline
            isDark={isDark}
          />

          {/* Status Section */}
          <SectionHeader title="Status" isDark={isDark} />

          <ActiveToggle
            value={isActive}
            onChange={setIsActive}
            isDark={isDark}
          />

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerPlaceholder: {
    fontSize: 16,
  },
  pickerList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  pickerOptionText: {
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  // Image picker styles
  imagesScroll: {
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addImageButton: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    marginTop: 4,
  },
  imageItem: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  imageHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
