import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const EMPLOYEE_LOGIN_HASHES = [
  CryptoJS.SHA256('1201').toString(),
  CryptoJS.SHA256('4507').toString(),
  CryptoJS.SHA256('8892').toString(),
  CryptoJS.SHA256('3320').toString(),
];

const TINCTURE_LOGIN_HASHES = [
  CryptoJS.SHA256('7734').toString(),
  CryptoJS.SHA256('9244').toString(),
];

const SHIFT_STORAGE_KEY = 'business_shift_records_v1';
const SKU_STORAGE_KEY = 'business_sku_counts_v1';

const SKU_CATALOG = [
  'Evergreen Candle',
  'Vanilla Amber Candle',
  'Citrus Bloom Candle',
  'Midnight Cedar Candle',
  'Lavender Drift Candle',
];

const TINCTURE_MENU = [
  { name: 'Calm Blend Tincture', dosage: '1 ml', notes: 'Lavender + chamomile' },
  { name: 'Focus Blend Tincture', dosage: '0.5 ml', notes: 'Peppermint + ginseng' },
  { name: 'Restore Blend Tincture', dosage: '1 ml', notes: 'Ashwagandha + lemon balm' },
  { name: 'Night Blend Tincture', dosage: '1 ml', notes: 'Valerian + passionflower' },
];

const createEmptyRecord = () => ({
  id: `${Date.now()}`,
  date: new Date().toISOString().slice(0, 10),
  openingCash: '',
  closingCash: '',
  shifts: Array.from({ length: 4 }, (_, index) => ({
    label: `Shift ${index + 1}`,
    employeeId: '',
    cashIn: '',
    cashOut: '',
  })),
  notes: '',
});

export default function App() {
  const [screen, setScreen] = useState('login');
  const [employeeLogin, setEmployeeLogin] = useState('');
  const [tinctureLogin, setTinctureLogin] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(createEmptyRecord());
  const [skuCounts, setSkuCounts] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadStoredData = async () => {
      const storedRecords = await SecureStore.getItemAsync(SHIFT_STORAGE_KEY);
      const storedSkus = await SecureStore.getItemAsync(SKU_STORAGE_KEY);
      if (storedRecords) {
        setRecords(JSON.parse(storedRecords));
      }
      if (storedSkus) {
        setSkuCounts(JSON.parse(storedSkus));
      } else {
        const defaults = SKU_CATALOG.reduce((acc, sku) => {
          acc[sku] = 0;
          return acc;
        }, {});
        setSkuCounts(defaults);
      }
      setLoaded(true);
    };

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(SHIFT_STORAGE_KEY, JSON.stringify(records));
  }, [loaded, records]);

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(SKU_STORAGE_KEY, JSON.stringify(skuCounts));
  }, [loaded, skuCounts]);

  const handleEmployeeLogin = () => {
    const hashed = CryptoJS.SHA256(employeeLogin).toString();
    if (!EMPLOYEE_LOGIN_HASHES.includes(hashed)) {
      Alert.alert('Invalid login number');
      return;
    }
    setEmployeeLogin('');
    setScreen('home');
  };

  const handleTinctureLogin = () => {
    const hashed = CryptoJS.SHA256(tinctureLogin).toString();
    if (!TINCTURE_LOGIN_HASHES.includes(hashed)) {
      Alert.alert('Invalid tincture login number');
      return;
    }
    setTinctureLogin('');
    setScreen('tinctureMenu');
  };

  const openRecord = (record) => {
    setSelectedRecord(record);
    setScreen('shift');
  };

  const saveRecord = () => {
    const updatedRecords = records.filter((record) => record.id !== selectedRecord.id);
    updatedRecords.unshift(selectedRecord);
    setRecords(updatedRecords);
    setScreen('home');
  };

  const resetRecord = () => {
    setSelectedRecord(createEmptyRecord());
    setScreen('shift');
  };

  const updateShiftField = (index, field, value) => {
    const nextShifts = selectedRecord.shifts.map((shift, shiftIndex) => {
      if (shiftIndex !== index) return shift;
      return { ...shift, [field]: value };
    });
    setSelectedRecord({ ...selectedRecord, shifts: nextShifts });
  };

  const updateRecordField = (field, value) => {
    setSelectedRecord({ ...selectedRecord, [field]: value });
  };

  const shiftChecks = useMemo(() => {
    const results = [];
    for (let index = 0; index < selectedRecord.shifts.length - 1; index += 1) {
      const currentOut = Number(selectedRecord.shifts[index].cashOut || 0);
      const nextIn = Number(selectedRecord.shifts[index + 1].cashIn || 0);
      results.push({
        label: `${selectedRecord.shifts[index].label} cash out vs ${selectedRecord.shifts[index + 1].label} cash in`,
        difference: currentOut - nextIn,
      });
    }
    return results;
  }, [selectedRecord.shifts]);

  const dayBalance = useMemo(() => {
    const opening = Number(selectedRecord.openingCash || 0);
    const closing = Number(selectedRecord.closingCash || 0);
    const totalIn = selectedRecord.shifts.reduce(
      (sum, shift) => sum + Number(shift.cashIn || 0),
      0
    );
    const totalOut = selectedRecord.shifts.reduce(
      (sum, shift) => sum + Number(shift.cashOut || 0),
      0
    );
    return closing - opening + totalIn - totalOut;
  }, [selectedRecord]);

  if (screen === 'login') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Business Tracking Login</Text>
        <Text style={styles.subtitle}>
          Encrypted employee login numbers only.
        </Text>
        <TextInput
          value={employeeLogin}
          onChangeText={setEmployeeLogin}
          placeholder="Enter login number"
          keyboardType="number-pad"
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleEmployeeLogin}>
          <Text style={styles.primaryButtonText}>Enter Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setScreen('tinctureLogin')}
        >
          <Text style={styles.linkText}>Go to Tincture App Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'tinctureLogin') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tincture App Login</Text>
        <Text style={styles.subtitle}>Access limited to tincture team.</Text>
        <TextInput
          value={tinctureLogin}
          onChangeText={setTinctureLogin}
          placeholder="Enter tincture login number"
          keyboardType="number-pad"
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleTinctureLogin}>
          <Text style={styles.primaryButtonText}>Enter Tincture Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => setScreen('login')}>
          <Text style={styles.linkText}>Back to Business Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'tinctureMenu') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tincture Menu</Text>
        <Text style={styles.subtitle}>Secure menu for tincture-only workflows.</Text>
        <FlatList
          data={TINCTURE_MENU}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardText}>Recommended dosage: {item.dosage}</Text>
              <Text style={styles.cardText}>Notes: {item.notes}</Text>
            </View>
          )}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('login')}>
          <Text style={styles.secondaryButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'shift') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Shift Cash Tracker</Text>
        <Text style={styles.subtitle}>
          Each shift cash out should match the next shift cash in.
        </Text>
        <TextInput
          value={selectedRecord.date}
          onChangeText={(value) => updateRecordField('date', value)}
          placeholder="YYYY-MM-DD"
          style={styles.input}
        />
        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.fieldLabel}>Opening cash</Text>
            <TextInput
              value={selectedRecord.openingCash}
              onChangeText={(value) => updateRecordField('openingCash', value)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.flexField}>
            <Text style={styles.fieldLabel}>Closing cash</Text>
            <TextInput
              value={selectedRecord.closingCash}
              onChangeText={(value) => updateRecordField('closingCash', value)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </View>
        {selectedRecord.shifts.map((shift, index) => (
          <View key={shift.label} style={styles.card}>
            <Text style={styles.cardTitle}>{shift.label}</Text>
            <TextInput
              value={shift.employeeId}
              onChangeText={(value) => updateShiftField(index, 'employeeId', value)}
              placeholder="Employee login number"
              style={styles.input}
            />
            <View style={styles.row}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>Cash in</Text>
                <TextInput
                  value={shift.cashIn}
                  onChangeText={(value) => updateShiftField(index, 'cashIn', value)}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>Cash out</Text>
                <TextInput
                  value={shift.cashOut}
                  onChangeText={(value) => updateShiftField(index, 'cashOut', value)}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        ))}
        <TextInput
          value={selectedRecord.notes}
          onChangeText={(value) => updateRecordField('notes', value)}
          placeholder="Daily notes"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Daily balance check</Text>
          <Text style={styles.summaryText}>
            Net difference (should be 0 when balanced): {dayBalance.toFixed(2)}
          </Text>
          {shiftChecks.map((check) => (
            <Text key={check.label} style={styles.summaryText}>
              {check.label}: {check.difference.toFixed(2)}
            </Text>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={saveRecord}>
          <Text style={styles.primaryButtonText}>Save Day</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen('home')}
        >
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'sku') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SKU Tracker</Text>
        <Text style={styles.subtitle}>
          Track candle SKUs by count for each day.
        </Text>
        <FlatList
          data={SKU_CATALOG}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item}</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() =>
                    setSkuCounts((prev) => ({
                      ...prev,
                      [item]: Math.max(0, (prev[item] || 0) - 1),
                    }))
                  }
                >
                  <Text style={styles.counterText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{skuCounts[item] ?? 0}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() =>
                    setSkuCounts((prev) => ({
                      ...prev,
                      [item]: (prev[item] || 0) + 1,
                    }))
                  }
                >
                  <Text style={styles.counterText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('home')}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Dashboard</Text>
      <Text style={styles.subtitle}>
        Manage 12-hour shifts, cash tracking, and SKU inventory.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={resetRecord}>
        <Text style={styles.primaryButtonText}>Start New Shift Day</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('sku')}>
        <Text style={styles.primaryButtonText}>Open SKU Tracker</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setScreen('tinctureLogin')}
      >
        <Text style={styles.secondaryButtonText}>Go to Tincture App</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Saved Daily Cash-outs</Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No records yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openRecord(item)}>
            <Text style={styles.cardTitle}>{item.date}</Text>
            <Text style={styles.cardText}>Opening cash: {item.openingCash || '0.00'}</Text>
            <Text style={styles.cardText}>Closing cash: {item.closingCash || '0.00'}</Text>
            <Text style={styles.cardText}>Notes: {item.notes || 'None'}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setScreen('login')}
      >
        <Text style={styles.secondaryButtonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 48,
    backgroundColor: '#0f1218',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f5f7ff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#c3cad9',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#e6e9f5',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a2f3d',
    backgroundColor: '#181c24',
    color: '#f5f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#5c6eff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#f5f7ff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#232837',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#d0d6e6',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#9aa9ff',
  },
  card: {
    backgroundColor: '#181c24',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f5f7ff',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardText: {
    color: '#c3cad9',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#aab2c5',
    marginBottom: 6,
  },
  summaryBox: {
    backgroundColor: '#1d2330',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#f5f7ff',
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryText: {
    color: '#c3cad9',
  },
  counterButton: {
    backgroundColor: '#2f3545',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  counterText: {
    color: '#f5f7ff',
    fontSize: 18,
  },
  counterValue: {
    color: '#f5f7ff',
    fontSize: 18,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#8b93a8',
    marginBottom: 12,
  },
});
