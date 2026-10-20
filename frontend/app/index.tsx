import { useState } from 'react';
import {
  ActivityIndicator,
  Alert, Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// URL ของ Backend API
const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'dashboard'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Theme State (Dark / Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Employee States
  const [employees, setEmployees] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Leave'>('All');

  // K-Means Analytics States
  const [clusters, setClusters] = useState<any[]>([]);
  const [loadingCluster, setLoadingCluster] = useState(false);

  // Dynamic Theme Colors (Pink & Black / Pink & Light)
  const theme = {
    bg: isDarkMode ? '#121212' : '#FDF2F8',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    innerCardBg: isDarkMode ? '#282828' : '#FCE7F3',
    inputBg: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    inputBorder: isDarkMode ? '#333333' : '#FBCFE8',
    textPrimary: isDarkMode ? '#FFFFFF' : '#831843',
    textSecondary: isDarkMode ? '#A1A1AA' : '#9D174D',
    placeholder: isDarkMode ? '#71717A' : '#9CA3AF',
    primaryPink: '#EC4899',
    pinkHover: '#DB2777',
    pinkAccent: '#F472B6',
    deleteRed: '#BE123C',
    togglePurple: '#8B5CF6',
  };

  // ดึงข้อมูลพนักงานจาก Backend
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Login Handler
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'กรุณากรอก Username และ Password');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentView('dashboard');
        fetchEmployees();
      } else {
        Alert.alert('Login Failed', data.message || 'Unauthorized');
      }
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถเชื่อมต่อกับ Server ได้');
    }
  };

  // Add Employee Handler (CRUD: Create)
  const handleAddEmployee = async () => {
    if (!name.trim() || !position.trim() || !salary.trim()) {
      Alert.alert('Bad Request (400)', 'กรุณากรอกข้อมูล Name, Position และ Salary ให้ครบถ้วน');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, position, salary: Number(salary) }),
      });

      if (response.status === 400) {
        Alert.alert('Error', 'ข้อมูลไม่ถูกต้อง (Bad Request)');
        return;
      }

      if (response.ok) {
        setName('');
        setPosition('');
        setSalary('');
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  // Toggle Status Handler (CRUD: Update Status)
  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/employees/${id}/status`, {
        method: 'PUT',
      });
      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  // Delete Employee Handler (CRUD: Delete with Confirmation Alert)
  const handleDeleteEmployee = (id: string) => {
    const confirmDelete = async () => {
      try {
        const response = await fetch(`${API_URL}/employees/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchEmployees();
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this employee?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Are you sure?', 'ต้องการลบพนักงานคนนี้ใช่หรือไม่?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  // Fetch K-Means Salary Clusters (Phase 2)
  const handleAnalyzeSalary = async () => {
    setLoadingCluster(true);
    try {
      const response = await fetch(`${API_URL}/employees/salary-clusters`);
      const data = await response.json();
      if (response.ok && data.success) {
        setClusters(data.clusters);
      }
    } catch (error) {
      console.error('Error analyzing salary:', error);
    } finally {
      setLoadingCluster(false);
    }
  };

  // Filter Employees Logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {currentView === 'login' ? (
        <View style={styles.centerCard}>
          {/* Top Right Theme Switcher in Login */}
          <View style={styles.loginThemeRow}>
            <TouchableOpacity 
              style={[styles.themeBtn, { backgroundColor: theme.cardBg, borderColor: theme.inputBorder }]} 
              onPress={() => setIsDarkMode(!isDarkMode)}
            >
              <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 12 }}>
                {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.primaryPink }]}>HR Manager Login</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
            placeholder="Username (admin)"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
            placeholder="Password (password123)"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primaryPink }]} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.dashboardContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>📊 HR Dashboard & Analytics</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* Theme Toggle Button */}
              <TouchableOpacity 
                style={[styles.themeBtn, { backgroundColor: theme.cardBg, borderColor: theme.inputBorder }]} 
                onPress={() => setIsDarkMode(!isDarkMode)}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 12 }}>
                  {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                </Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity onPress={() => setCurrentView('login')} style={[styles.logoutBtn, { backgroundColor: theme.deleteRed }]}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Employee Form */}
          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.cardTitle, { color: theme.pinkAccent }]}>+ Add New Employee</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Name"
              placeholderTextColor={theme.placeholder}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Position"
              placeholderTextColor={theme.placeholder}
              value={position}
              onChangeText={setPosition}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Salary"
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              value={salary}
              onChangeText={setSalary}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primaryPink }]} onPress={handleAddEmployee}>
              <Text style={styles.buttonText}>Add Employee</Text>
            </TouchableOpacity>
          </View>

          {/* K-Means Salary Clustering (Phase 2) */}
          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.cardTitle, { color: theme.pinkAccent }]}>📈 Salary Structure Clustering (K-Means)</Text>
            <TouchableOpacity style={[styles.analyzeButton, { backgroundColor: theme.primaryPink }]} onPress={handleAnalyzeSalary}>
              <Text style={styles.buttonText}>Analyze Salary Structure</Text>
            </TouchableOpacity>

            {loadingCluster ? (
              <ActivityIndicator size="large" color={theme.primaryPink} style={{ marginTop: 15 }} />
            ) : (
              <View style={styles.clusterResultRow}>
                {clusters.map((cluster, index) => (
                  <View key={index} style={[styles.clusterCard, { backgroundColor: theme.innerCardBg, borderColor: theme.inputBorder }]}>
                    <Text style={[styles.clusterTier, { color: theme.pinkAccent }]}>{cluster.group}</Text>
                    <Text style={[styles.clusterText, { color: theme.textSecondary }]}>Avg: ฿{cluster.centroid.toLocaleString()}</Text>
                    <Text style={[styles.clusterText, { color: theme.textSecondary }]}>Count: {cluster.count} persons</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Search & Filter Card */}
          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.cardTitle, { color: theme.pinkAccent }]}>🔍 Search & Filter Employees</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Search by name or position..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.filterTabRow}>
              {(['All', 'Active', 'On Leave'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterTab,
                    { backgroundColor: theme.innerCardBg },
                    statusFilter === tab && { backgroundColor: theme.primaryPink }
                  ]}
                  onPress={() => setStatusFilter(tab)}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: theme.textPrimary },
                    statusFilter === tab && { color: '#FFFFFF', fontWeight: 'bold' }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Employee List */}
          <Text style={[styles.sectionTitle, { color: theme.pinkAccent }]}>
            Employee Records ({filteredEmployees.length} / {employees.length})
          </Text>

          {filteredEmployees.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBg }]}>
              <Text style={{ color: theme.textSecondary }}>No employees match your search or filter.</Text>
            </View>
          ) : (
            filteredEmployees.map(emp => (
              <View key={emp.id} style={[styles.empCard, { backgroundColor: theme.cardBg, borderColor: theme.inputBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.empName, { color: theme.textPrimary }]}>{emp.name}</Text>
                  <Text style={[styles.empDetails, { color: theme.textSecondary }]}>{emp.position} | ฿{emp.salary.toLocaleString()}</Text>
                  <Text style={[styles.empStatus, emp.status === 'Active' ? styles.active : styles.leave]}>
                    Status: {emp.status}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.statusBtn, { backgroundColor: theme.togglePurple }]} onPress={() => handleToggleStatus(emp.id)}>
                    <Text style={styles.actionBtnText}>Toggle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: theme.deleteRed }]} onPress={() => handleDeleteEmployee(emp.id)}>
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, maxWidth: 400, alignSelf: 'center', width: '100%' },
  loginThemeRow: { position: 'absolute', top: 20, right: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12, fontSize: 14 },
  button: { width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  dashboardContainer: { padding: 16, maxWidth: 600, alignSelf: 'center', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  themeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  card: { padding: 16, borderRadius: 10, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  addButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  analyzeButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  clusterResultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  clusterCard: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  clusterTier: { fontWeight: 'bold', marginBottom: 4 },
  clusterText: { fontSize: 11 },
  filterTabRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  filterTabText: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  emptyCard: { padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  empCard: { padding: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1 },
  empName: { fontSize: 16, fontWeight: 'bold' },
  empDetails: { fontSize: 13, marginVertical: 2 },
  empStatus: { fontSize: 12, fontWeight: 'bold' },
  active: { color: '#10B981' },
  leave: { color: '#F59E0B' },
  actionRow: { flexDirection: 'row', gap: 6 },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});