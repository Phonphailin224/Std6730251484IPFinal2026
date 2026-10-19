import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3110/api';

interface Product {
  id: number;
  name: string;
  price: string | number;
  stock: number;
  category?: string;
  scent?: string;
  image?: string;
  brand?: string;
  sizes?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

const CATEGORIES = ['ALL', 'FLORAL', 'WOODY', 'FRESH', 'GOURMAND'];
const PRODUCT_CATEGORIES = ['FLORAL', 'WOODY', 'FRESH', 'GOURMAND'];

// Helper สำหรับแสดง Alert ให้รองรับทั้ง Web และ Native
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const apiCall = async (endpoint: string, options: Record<string, any> = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `API Error: ${response.statusText}`);
  return data;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginRole, setLoginRole] = useState<'user' | 'admin'>('user');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Admin Tab State ('products' | 'dashboard')
  const [adminTab, setAdminTab] = useState<'products' | 'dashboard'>('products');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [scent, setScent] = useState('');
  const [sizes, setSizes] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('FLORAL');

  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      showAlert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      if (loginRole === 'user') {
        if (isRegisterMode) {
          await apiCall('/register', { 
            method: 'POST', 
            body: JSON.stringify({ email: authEmail, password: authPassword, role: 'user' }) 
          });
          showAlert('Success', 'Registration successful! Please sign in.');
          setIsRegisterMode(false);
        } else {
          const res = await apiCall('/login', { 
            method: 'POST', 
            body: JSON.stringify({ email: authEmail, password: authPassword }) 
          });

          if (res.user.role === 'admin') {
            showAlert('Access Denied', 'This account is an admin! Please sign in via the "Admin" tab.');
            return;
          }

          setUser(res.user);
          fetchProducts();
        }
      } else {
        const res = await apiCall('/login', { 
          method: 'POST', 
          body: JSON.stringify({ email: authEmail, password: authPassword }) 
        });

        if (res.user.role !== 'admin') {
          showAlert('Access Denied', 'This account is not an admin.');
          return;
        }

        setUser(res.user);
        fetchProducts();
      }
    } catch (err: any) {
      showAlert('Authentication Error', err.message || 'Authentication error occurred.');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showAlert('Error', 'Error fetching products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showAlert('Out of Stock', 'Product is out of stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showAlert('Limit Reached', 'Quantity has reached available stock limit.');
          return prev;
        }
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > item.product.stock) {
            showAlert('Limit Reached', 'Cannot exceed available stock limit.');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName(''); setPrice(''); setStock(''); setScent(''); setSizes(''); setImage(''); setCategory('FLORAL');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingId(product.id);
    setName(product.name || '');
    setPrice(product.price ? product.price.toString() : '');
    setStock(product.stock ? product.stock.toString() : '');
    setScent(product.scent || '');
    setSizes(product.sizes || '');
    setImage(product.image || '');
    setCategory(product.category || 'FLORAL');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!name || !price || !stock) {
      showAlert('Missing Fields', 'Please fill in Name, Price, and Stock.');
      return;
    }
    const payload = { name, brand: 'JUT.FAI', price: parseFloat(price), stock: parseInt(stock, 10), scent, sizes, image, category };

    try {
      if (editingId) {
        await apiCall(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiCall('/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showAlert('Operation Failed', err.message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const performDelete = async () => {
      try {
        await apiCall(`/products/${id}`, { method: 'DELETE' });
        fetchProducts();
        showAlert('Success', 'Product deleted successfully.');
      } catch (err: any) {
        showAlert('Failed', 'Failed to delete product: ' + err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this product?');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this product?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || product.scent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || product.category?.toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCategory;
  });

  // Dashboard Calculations
  const totalProductsCount = products.length;
  const totalStockCount = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const potentialInventoryValue = products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0);
  const lowStockProducts = products.filter((p) => Number(p.stock || 0) < 5);

  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.vsBrandTitle}>JUT.FAI</Text>

          <View style={styles.roleToggleContainer}>
            <TouchableOpacity
              style={[styles.roleTab, loginRole === 'user' && styles.roleTabActive]}
              onPress={() => {
                setLoginRole('user');
                setIsRegisterMode(false);
              }}
            >
              <Text style={[styles.roleTabText, loginRole === 'user' && styles.roleTabTextActive]}>
                CUSTOMER
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, loginRole === 'admin' && styles.roleTabActive]}
              onPress={() => {
                setLoginRole('admin');
                setIsRegisterMode(false);
              }}
            >
              <Text style={[styles.roleTabText, loginRole === 'admin' && styles.roleTabTextActive]}>
                ADMIN
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.formHeaderTitle}>
            {loginRole === 'user' 
              ? (isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN') 
              : 'ADMIN PORTAL'}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.textInput}
              placeholder="********"
              placeholderTextColor="#999"
              secureTextEntry
              value={authPassword}
              onChangeText={setAuthPassword}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, loginRole === 'admin' && { backgroundColor: '#111' }]} 
            onPress={handleAuth}
          >
            <Text style={styles.submitBtnText}>
              {loginRole === 'user' && isRegisterMode ? 'REGISTER' : 'SIGN IN'}
            </Text>
          </TouchableOpacity>

          {loginRole === 'user' && (
            <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
              <Text style={styles.toggleRegisterText}>
                {isRegisterMode ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.vsHeader}>
        <View style={styles.vsTopBar}>
          <Text style={styles.userInfoText} numberOfLines={1}>
            {user.role === 'admin' ? 'ADMIN PANEL' : user.email}
          </Text>

          <View style={styles.vsTopRightActions}>
            {user.role === 'admin' && (
              <TouchableOpacity style={styles.vsAddButtonProminent} onPress={handleOpenAddModal}>
                <Text style={styles.vsAddButtonText}>+ Add Product</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setUser(null)}>
              <Text style={styles.vsLogoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vsBrandCenterContainer}>
          <Text style={styles.vsBrandName}>J U T . F A I</Text>
        </View>

        {/* Admin Navigation Tabs */}
        {user.role === 'admin' && (
          <View style={styles.adminNavTabs}>
            <TouchableOpacity 
              style={[styles.adminNavTabItem, adminTab === 'products' && styles.adminNavTabActive]}
              onPress={() => setAdminTab('products')}
            >
              <Text style={[styles.adminNavTabText, adminTab === 'products' && styles.adminNavTabTexActive]}>
                📦 PRODUCTS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.adminNavTabItem, adminTab === 'dashboard' && styles.adminNavTabActive]}
              onPress={() => setAdminTab('dashboard')}
            >
              <Text style={[styles.adminNavTabText, adminTab === 'dashboard' && styles.adminNavTabTexActive]}>
                📊 DASHBOARD
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search & Cart Bar (Shown for customers or when admin is on products tab) */}
        {(user.role === 'user' || (user.role === 'admin' && adminTab === 'products')) && (
          <>
            <View style={styles.vsBottomBar}>
              <View style={styles.vsSearchContainer}>
                <TextInput
                  style={styles.vsSearchInput}
                  placeholder="SEARCH"
                  placeholderTextColor="#777"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {user.role === 'user' && (
                <TouchableOpacity style={styles.vsCartButton} onPress={() => setIsCartOpen(true)}>
                  <Text style={styles.vsCartIconText}>🛒</Text>
                  {totalCartCount > 0 && (
                    <View style={styles.vsCartBadge}>
                      <Text style={styles.vsCartBadgeText}>{totalCartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.vsCategoryBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vsCategoryScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.vsCategoryItem, selectedCategory === cat && styles.vsCategoryItemActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.vsCategoryText, selectedCategory === cat && styles.vsCategoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* Main Content Area: Products vs Dashboard */}
      {user.role === 'admin' && adminTab === 'dashboard' ? (
        <ScrollView contentContainerStyle={styles.dashboardContainer}>
          <Text style={styles.dashboardHeaderTitle}>STORE PERFORMANCE DASHBOARD</Text>

          <View style={styles.dashboardCardGrid}>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabel}>TOTAL PRODUCTS</Text>
              <Text style={styles.dashboardCardValue}>{totalProductsCount}</Text>
            </View>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabel}>TOTAL STOCK UNITS</Text>
              <Text style={styles.dashboardCardValue}>{totalStockCount}</Text>
            </View>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabel}>POTENTIAL VALUE</Text>
              <Text style={styles.dashboardCardValue}>฿{potentialInventoryValue.toLocaleString()}</Text>
            </View>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabel}>LOW STOCK ITEMS</Text>
              <Text style={[styles.dashboardCardValue, { color: lowStockProducts.length > 0 ? '#D32F2F' : '#2E7D32' }]}>
                {lowStockProducts.length}
              </Text>
            </View>
          </View>

          <Text style={styles.dashboardSubHeader}>⚠️ Low Stock Alerts (&lt; 5 units)</Text>
          {lowStockProducts.length === 0 ? (
            <Text style={styles.noLowStockText}>All products are sufficiently stocked.</Text>
          ) : (
            lowStockProducts.map((item) => (
              <View key={item.id} style={styles.lowStockRow}>
                <Text style={styles.lowStockName}>{item.name}</Text>
                <Text style={styles.lowStockBadge}>Stock: {item.stock}</Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* Product List */
        loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#111" /></View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.productImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>JUT.FAI</Text>
                  </View>
                )}

                <View style={styles.cardDetails}>
                  <View style={styles.brandRow}>
                    <Text style={styles.brand}>{item.category || 'SCENTED CANDLE'}</Text>
                    <Text style={styles.stockText}>Stock: {item.stock}</Text>
                  </View>

                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.subText}>Scent: {item.scent || '-'}</Text>

                  <View style={styles.footerRow}>
                    <Text style={styles.price}>฿{Number(item.price).toLocaleString()}</Text>
                    {user.role === 'user' && (
                      <TouchableOpacity style={styles.addToCartBtn} onPress={() => addToCart(item)}>
                        <Text style={styles.addToCartBtnText}>+ Add to Bag</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {user.role === 'admin' && (
                    <View style={styles.manageRow}>
                      <TouchableOpacity onPress={() => handleOpenEditModal(item)}>
                        <Text style={styles.actionEditText}>Edit</Text>
                      </TouchableOpacity>
                      <Text style={styles.divider}>|</Text>
                      <TouchableOpacity onPress={() => handleDeleteProduct(item.id)}>
                        <Text style={styles.actionDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        )
      )}

      {/* Cart Modal */}
      <Modal visible={isCartOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContent}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>🛒 SHOPPING BAG</Text>
              <TouchableOpacity onPress={() => setIsCartOpen(false)}><Text style={styles.closeCartBtn}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView style={styles.cartList}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>฿{Number(item.product.price).toLocaleString()}</Text>
                  </View>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQuantity(item.product.id, -1)}><Text>-</Text></TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQuantity(item.product.id, 1)}><Text>+</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL:</Text>
                <Text style={styles.totalPrice}>฿{totalCartPrice.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutBtn} onPress={() => { showAlert('Success', 'Order placed successfully!'); setCart([]); setIsCartOpen(false); }}>
                <Text style={styles.checkoutBtnText}>CHECKOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</Text>
              
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
              
              <Text style={styles.inputLabel}>Price (THB) *</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
              
              <Text style={styles.inputLabel}>Stock *</Text>
              <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" />
              
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryPickerContainer}>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPickerItem, category === cat && styles.categoryPickerItemActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryPickerText, category === cat && styles.categoryPickerTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Scent</Text>
              <TextInput style={styles.input} value={scent} onChangeText={setScent} />
              
              <Text style={styles.inputLabel}>Size / Category Detail</Text>
              <TextInput style={styles.input} value={sizes} onChangeText={setSizes} />
              
              <Text style={styles.inputLabel}>Image URL</Text>
              <TextInput style={styles.input} value={image} onChangeText={setImage} autoCapitalize="none" />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setIsModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveProduct}>
                  <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const MINIMAL_FONT = 'System';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  authContainer: {
    flex: 1,
    backgroundColor: '#FFF0F3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  vsBrandTitle: {
    fontFamily: MINIMAL_FONT,
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 4,
    marginBottom: 24,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 0,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleTabActive: {
    backgroundColor: '#111',
  },
  roleTabText: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    color: '#666',
    letterSpacing: 1,
  },
  roleTabTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formHeaderTitle: {
    fontFamily: MINIMAL_FONT,
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 1,
    marginBottom: 18,
  },
  formGroup: {
    width: '100%',
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  submitBtn: {
    backgroundColor: '#111',
    borderRadius: 0,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtnText: {
    fontFamily: MINIMAL_FONT,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 2,
  },
  toggleRegisterText: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    color: '#111',
    textDecorationLine: 'underline',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header Styles
  vsHeader: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA', paddingTop: 6 },
  vsTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 },
  userInfoText: { fontSize: 11, color: '#666', fontFamily: MINIMAL_FONT, maxWidth: '40%' },
  vsTopRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  vsAddButtonProminent: { 
    backgroundColor: '#FFB6C1', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 2,
  },
  vsAddButtonText: { color: '#111', fontSize: 11, fontWeight: '700', fontFamily: MINIMAL_FONT, letterSpacing: 1 },
  vsLogoutText: { color: '#C94A4A', fontSize: 11, fontFamily: MINIMAL_FONT, textDecorationLine: 'underline' },

  vsBrandCenterContainer: { alignItems: 'center', paddingVertical: 8 },
  vsBrandName: {
    fontFamily: MINIMAL_FONT,
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 6,
    textAlign: 'center',
  },

  // Admin Nav Tabs
  adminNavTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FAFAFA',
  },
  adminNavTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  adminNavTabActive: {
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#111',
  },
  adminNavTabText: {
    fontSize: 11,
    fontFamily: MINIMAL_FONT,
    color: '#777',
    letterSpacing: 1,
  },
  adminNavTabTexActive: {
    fontWeight: '700',
    color: '#111',
  },

  // Dashboard Styles
  dashboardContainer: { padding: 16 },
  dashboardHeaderTitle: {
    fontFamily: MINIMAL_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 1,
    marginBottom: 16,
  },
  dashboardCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  dashboardCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: 16,
    borderRadius: 0,
  },
  dashboardCardLabel: {
    fontFamily: MINIMAL_FONT,
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
    marginBottom: 6,
  },
  dashboardCardValue: {
    fontFamily: MINIMAL_FONT,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  dashboardSubHeader: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  noLowStockText: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  lowStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: 12,
    marginBottom: 8,
  },
  lowStockName: {
    fontFamily: MINIMAL_FONT,
    fontSize: 12,
    color: '#111',
  },
  lowStockBadge: {
    fontFamily: MINIMAL_FONT,
    fontSize: 11,
    fontWeight: '700',
    color: '#D32F2F',
  },

  vsBottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  vsSearchContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    paddingHorizontal: 12, 
    height: 38, 
    borderWidth: 0,
    borderColor: 'transparent',
  },
  vsSearchInput: { 
    flex: 1, 
    fontSize: 12, 
    color: '#111', 
    fontFamily: MINIMAL_FONT, 
    letterSpacing: 1, 
    padding: 0, 
    borderWidth: 0,
    borderColor: 'transparent',
  },
  
  vsCartButton: { position: 'relative', padding: 6 },
  vsCartIconText: { fontSize: 20 },
  vsCartBadge: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    backgroundColor: '#111', 
    borderRadius: 10, 
    minWidth: 16, 
    height: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 3 
  },
  vsCartBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  vsCategoryBar: { borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FFF' },
  vsCategoryScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 20, paddingRight: 32 },
  vsCategoryItem: { paddingVertical: 4, paddingHorizontal: 4 },
  vsCategoryItemActive: { borderBottomWidth: 1.5, borderBottomColor: '#111' },
  vsCategoryText: { fontSize: 12, fontFamily: MINIMAL_FONT, color: '#666', letterSpacing: 1.5 },
  vsCategoryTextActive: { fontWeight: '700', color: '#111' },

  listContainer: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 0, marginBottom: 14, padding: 12, borderWidth: 1, borderColor: '#EBEBEB', flexDirection: 'row', elevation: 0 },
  productImage: { width: 80, height: 80, borderRadius: 0, marginRight: 12, backgroundColor: '#F9F9F9' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontFamily: MINIMAL_FONT, fontWeight: '700', color: '#888', fontSize: 11, letterSpacing: 1 },
  cardDetails: { flex: 1, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between' },
  brand: { fontFamily: MINIMAL_FONT, fontSize: 10, color: '#666', letterSpacing: 1 },
  stockText: { fontFamily: MINIMAL_FONT, fontSize: 10, color: '#2E7D32' },
  title: { fontFamily: MINIMAL_FONT, fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: 0.5 },
  subText: { fontFamily: MINIMAL_FONT, fontSize: 11, color: '#777' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontFamily: MINIMAL_FONT, fontSize: 15, fontWeight: '700', color: '#111' },
  addToCartBtn: { backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 0 },
  addToCartBtnText: { fontFamily: MINIMAL_FONT, color: '#FFF', fontSize: 11, letterSpacing: 1 },
  manageRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  actionEditText: { fontFamily: MINIMAL_FONT, fontSize: 11, color: '#1976D2' },
  actionDeleteText: { fontFamily: MINIMAL_FONT, fontSize: 11, color: '#D32F2F' },
  divider: { fontSize: 11, color: '#CCC' },
  inputLabel: { fontFamily: MINIMAL_FONT, fontSize: 12, color: '#333', marginBottom: 4, letterSpacing: 1 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 0, padding: 10, marginBottom: 12, fontSize: 14, backgroundColor: '#FAFAFA' },
  
  categoryPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  categoryPickerItemActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  categoryPickerText: {
    fontFamily: MINIMAL_FONT,
    fontSize: 11,
    color: '#333',
  },
  categoryPickerTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  cartModalContent: { backgroundColor: '#FFF', borderRadius: 0, padding: 20, maxHeight: '80%' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 12 },
  cartTitle: { fontFamily: MINIMAL_FONT, fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: 1 },
  closeCartBtn: { fontSize: 16, color: '#111', fontWeight: 'bold' },
  cartList: { marginVertical: 12 },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingVertical: 10 },
  cartItemName: { fontFamily: MINIMAL_FONT, fontSize: 13, color: '#111' },
  cartItemPrice: { fontFamily: MINIMAL_FONT, fontSize: 12, fontWeight: '700', color: '#111', marginTop: 2 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: '#F0F0F0', width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontFamily: MINIMAL_FONT, fontSize: 13 },
  cartFooter: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontFamily: MINIMAL_FONT, fontSize: 14, color: '#111', fontWeight: '700', letterSpacing: 1 },
  totalPrice: { fontFamily: MINIMAL_FONT, fontSize: 16, fontWeight: '700', color: '#111' },
  checkoutBtn: { backgroundColor: '#111', padding: 12, alignItems: 'center' },
  checkoutBtnText: { fontFamily: MINIMAL_FONT, fontWeight: '700', color: '#FFF', fontSize: 14, letterSpacing: 2 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 0, padding: 20, maxHeight: '85%' },
  modalTitle: { fontFamily: MINIMAL_FONT, fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16, textAlign: 'center', letterSpacing: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalBtn: { flex: 1, padding: 12, alignItems: 'center', marginHorizontal: 4 },
  cancelBtn: { backgroundColor: '#EEE' },
  saveBtn: { backgroundColor: '#111' },
  cancelBtnText: { fontFamily: MINIMAL_FONT, color: '#555' },
  saveBtnText: { fontFamily: MINIMAL_FONT, color: '#FFF', letterSpacing: 1 }
});