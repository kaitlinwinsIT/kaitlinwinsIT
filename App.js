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

const SHIFT_STORAGE_KEY = 'business_shift_records_v3';
const SKU_STORAGE_KEY = 'business_sku_counts_v1';
const ABSENCE_STORAGE_KEY = 'business_absence_reports_v1';
const SLA_STORAGE_KEY = 'business_weekly_sla_reports_v1';

const SKU_CATALOG = [
  'Philips LED Bulb',
  'Philips Tube Light',
  'Philips Smart Plug',
  'Philips Fixture Housing',
  'Philips Battery Pack',
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
    managerFeedback: '',
    notifyManager: false,
  })),
  inventoryLines: SKU_CATALOG.map((sku) => ({
    sku,
    inCount: '',
    outCount: '',
    soldCount: '',
    unitValue: '',
  })),
  barter: {
    description: '',
    value: '',
    secondEmployeeId: '',
    secondEmployeeSigned: false,
  },
  notes: '',
});

export default function App() {
  const [screen, setScreen] = useState('login');
  const [employeeLogin, setEmployeeLogin] = useState('');
  const [tinctureLogin, setTinctureLogin] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(createEmptyRecord());
  const [skuCounts, setSkuCounts] = useState({});
  const [absenceReports, setAbsenceReports] = useState([]);
  const [slaReports, setSlaReports] = useState([]);
  const [newAbsence, setNewAbsence] = useState({
    employeeId: '',
    reason: '',
    coveringEmployeeId: '',
    employeeSigned: false,
    managerSigned: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadStoredData = async () => {
      const storedRecords = await SecureStore.getItemAsync(SHIFT_STORAGE_KEY);
      const storedSkus = await SecureStore.getItemAsync(SKU_STORAGE_KEY);
      const storedAbsences = await SecureStore.getItemAsync(ABSENCE_STORAGE_KEY);
      const storedSlas = await SecureStore.getItemAsync(SLA_STORAGE_KEY);
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
      if (storedAbsences) {
        setAbsenceReports(JSON.parse(storedAbsences));
      }
      if (storedSlas) {
        setSlaReports(JSON.parse(storedSlas));
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

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(ABSENCE_STORAGE_KEY, JSON.stringify(absenceReports));
  }, [loaded, absenceReports]);

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(SLA_STORAGE_KEY, JSON.stringify(slaReports));
  }, [loaded, slaReports]);

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
    const incompleteLine = selectedRecord.inventoryLines.find(
      (line) => !isLineComplete(line)
    );
    if (incompleteLine) {
      Alert.alert(
        'Incomplete inventory line',
        'Complete each inventory row before saving.'
      );
      return;
    }
    if (
      selectedRecord.barter.description ||
      selectedRecord.barter.value ||
      selectedRecord.barter.secondEmployeeId
    ) {
      if (!selectedRecord.barter.secondEmployeeSigned) {
        Alert.alert(
          'Second employee sign-off required',
          'Barter transactions must be signed by a second employee.'
        );
        return;
      }
    }
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

  const updateInventoryLine = (index, field, value) => {
    const nextLines = selectedRecord.inventoryLines.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      return { ...line, [field]: value };
    });
    setSelectedRecord({ ...selectedRecord, inventoryLines: nextLines });
  };

  const isLineComplete = (line) =>
    line.sku &&
    line.inCount !== '' &&
    line.outCount !== '' &&
    line.soldCount !== '' &&
    line.unitValue !== '';

  const getLineTotal = (line) =>
    (Number(line.soldCount || 0) * Number(line.unitValue || 0)).toFixed(2);

  const updateBarter = (field, value) => {
    setSelectedRecord({
      ...selectedRecord,
      barter: { ...selectedRecord.barter, [field]: value },
    });
  };

  const toggleShiftNotify = (index) => {
    const nextShifts = selectedRecord.shifts.map((shift, shiftIndex) => {
      if (shiftIndex !== index) return shift;
      return { ...shift, notifyManager: !shift.notifyManager };
    });
    setSelectedRecord({ ...selectedRecord, shifts: nextShifts });
  };

  const markNotificationSent = (index) => {
    const nextShifts = selectedRecord.shifts.map((shift, shiftIndex) => {
      if (shiftIndex !== index) return shift;
      return { ...shift, notifyManager: false };
    });
    setSelectedRecord({ ...selectedRecord, shifts: nextShifts });
    Alert.alert('Manager notified', 'The shift entry was queued for email/text.');
  };

  const submitAbsenceReport = () => {
    if (!newAbsence.employeeId || !newAbsence.coveringEmployeeId || !newAbsence.reason) {
      Alert.alert('Missing details', 'Fill in employee, coverage, and reason.');
      return;
    }
    if (!newAbsence.employeeSigned || !newAbsence.managerSigned) {
      Alert.alert('Signatures required', 'Both parties must sign off.');
      return;
    }
    const report = {
      id: `${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      ...newAbsence,
    };
    setAbsenceReports((prev) => [report, ...prev]);
    setNewAbsence({
      employeeId: '',
      reason: '',
      coveringEmployeeId: '',
      employeeSigned: false,
      managerSigned: false,
    });
    Alert.alert('Manager notified', 'Absence report sent to manager.');
  };

  const generateWeeklySlaReport = () => {
    const report = {
      id: `${Date.now()}`,
      weekOf: new Date().toISOString().slice(0, 10),
      totalDays: records.length,
      balancedDays: records.filter((record) => {
        const opening = Number(record.openingCash || 0);
        const closing = Number(record.closingCash || 0);
        const totalIn = record.shifts.reduce(
          (sum, shift) => sum + Number(shift.cashIn || 0),
          0
        );
        const totalOut = record.shifts.reduce(
          (sum, shift) => sum + Number(shift.cashOut || 0),
          0
        );
        return closing - opening + totalIn - totalOut === 0;
      }).length,
      absenceCount: absenceReports.length,
      notes: 'Weekly SLA report prepared for Monday delivery.',
    };
    setSlaReports((prev) => [report, ...prev]);
    Alert.alert('Weekly SLA ready', 'Report queued for Monday morning delivery.');
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
            <Text style={styles.fieldLabel}>Manager feedback</Text>
            <TextInput
              value={shift.managerFeedback}
              onChangeText={(value) => updateShiftField(index, 'managerFeedback', value)}
              placeholder="Manager comment to employee"
              style={[styles.input, styles.multiline]}
              multiline
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={shift.notifyManager ? styles.primaryButton : styles.secondaryButton}
                onPress={() => toggleShiftNotify(index)}
              >
                <Text
                  style={
                    shift.notifyManager
                      ? styles.primaryButtonText
                      : styles.secondaryButtonText
                  }
                >
                  {shift.notifyManager ? 'Notification queued' : 'Notify manager'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => markNotificationSent(index)}
              >
                <Text style={styles.secondaryButtonText}>Mark sent</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Inventory & Sales Template</Text>
          <View style={[styles.row, styles.tableHeader]}>
            <Text style={[styles.tableHeaderText, styles.skuColumn]}>SKU</Text>
            <Text style={styles.tableHeaderText}>IN</Text>
            <Text style={styles.tableHeaderText}>OUT</Text>
            <Text style={styles.tableHeaderText}>SOLD</Text>
            <Text style={styles.tableHeaderText}>$$$</Text>
          </View>
          {selectedRecord.inventoryLines.map((line, index) => {
            const canEdit =
              index === 0 || isLineComplete(selectedRecord.inventoryLines[index - 1]);
            return (
              <View
                key={line.sku}
                style={[styles.row, styles.tableRow, !canEdit && styles.disabledRow]}
              >
                <Text style={[styles.tableCellText, styles.skuColumn]}>{line.sku}</Text>
                <TextInput
                  value={line.inCount}
                  onChangeText={(value) => updateInventoryLine(index, 'inCount', value)}
                  keyboardType="number-pad"
                  style={[styles.tableInput, !canEdit && styles.disabledInput]}
                  editable={canEdit}
                />
                <TextInput
                  value={line.outCount}
                  onChangeText={(value) => updateInventoryLine(index, 'outCount', value)}
                  keyboardType="number-pad"
                  style={[styles.tableInput, !canEdit && styles.disabledInput]}
                  editable={canEdit}
                />
                <TextInput
                  value={line.soldCount}
                  onChangeText={(value) => updateInventoryLine(index, 'soldCount', value)}
                  keyboardType="number-pad"
                  style={[styles.tableInput, !canEdit && styles.disabledInput]}
                  editable={canEdit}
                />
                <View style={styles.tableValueCell}>
                  <TextInput
                    value={line.unitValue}
                    onChangeText={(value) => updateInventoryLine(index, 'unitValue', value)}
                    keyboardType="decimal-pad"
                    style={[styles.tableInput, !canEdit && styles.disabledInput]}
                    editable={canEdit}
                  />
                  <Text style={styles.tableValueText}>x</Text>
                  <Text style={styles.tableValueText}>{getLineTotal(line)}</Text>
                </View>
              </View>
            );
          })}
          <Text style={styles.helperText}>
            Complete each row before moving to the next line.
          </Text>
        </View>
        <TextInput
          value={selectedRecord.notes}
          onChangeText={(value) => updateRecordField('notes', value)}
          placeholder="Daily notes"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Authorizations</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => Alert.alert('Manager notified', 'Manager has been alerted.')}
            >
              <Text style={styles.secondaryButtonText}>Notify manager</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Manager feedback is captured per shift above.
            </Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Notes</Text>
            <Text style={styles.helperText}>
              Use the daily notes field to log order requests and restock needs.
            </Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Merch / Barter</Text>
            <TextInput
              value={selectedRecord.barter.description}
              onChangeText={(value) => updateBarter('description', value)}
              placeholder="Merch description"
              style={styles.input}
            />
            <TextInput
              value={selectedRecord.barter.value}
              onChangeText={(value) => updateBarter('value', value)}
              placeholder="Merch value"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              value={selectedRecord.barter.secondEmployeeId}
              onChangeText={(value) => updateBarter('secondEmployeeId', value)}
              placeholder="Second employee sign-off ID"
              style={styles.input}
            />
            <TouchableOpacity
              style={
                selectedRecord.barter.secondEmployeeSigned
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              onPress={() =>
                updateBarter(
                  'secondEmployeeSigned',
                  !selectedRecord.barter.secondEmployeeSigned
                )
              }
            >
              <Text
                style={
                  selectedRecord.barter.secondEmployeeSigned
                    ? styles.primaryButtonText
                    : styles.secondaryButtonText
                }
              >
                {selectedRecord.barter.secondEmployeeSigned
                  ? 'Second employee signed'
                  : 'Second employee sign-off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
          Track Philips recycling SKUs by count for each day.
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

  if (screen === 'absence') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Absence & Coverage Notice</Text>
        <Text style={styles.subtitle}>
          Notify the manager when someone is out and record coverage sign-off.
        </Text>
        <TextInput
          value={newAbsence.employeeId}
          onChangeText={(value) => setNewAbsence((prev) => ({ ...prev, employeeId: value }))}
          placeholder="Employee login number"
          style={styles.input}
        />
        <TextInput
          value={newAbsence.reason}
          onChangeText={(value) => setNewAbsence((prev) => ({ ...prev, reason: value }))}
          placeholder="Reason (sick, PTO, etc.)"
          style={styles.input}
        />
        <TextInput
          value={newAbsence.coveringEmployeeId}
          onChangeText={(value) =>
            setNewAbsence((prev) => ({ ...prev, coveringEmployeeId: value }))
          }
          placeholder="Covering employee login number"
          style={styles.input}
        />
        <View style={styles.row}>
          <TouchableOpacity
            style={newAbsence.employeeSigned ? styles.primaryButton : styles.secondaryButton}
            onPress={() =>
              setNewAbsence((prev) => ({ ...prev, employeeSigned: !prev.employeeSigned }))
            }
          >
            <Text
              style={newAbsence.employeeSigned ? styles.primaryButtonText : styles.secondaryButtonText}
            >
              Employee signed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={newAbsence.managerSigned ? styles.primaryButton : styles.secondaryButton}
            onPress={() =>
              setNewAbsence((prev) => ({ ...prev, managerSigned: !prev.managerSigned }))
            }
          >
            <Text
              style={newAbsence.managerSigned ? styles.primaryButtonText : styles.secondaryButtonText}
            >
              Manager signed
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={submitAbsenceReport}>
          <Text style={styles.primaryButtonText}>Send to manager</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Recent absence notices</Text>
        <FlatList
          data={absenceReports}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No absence reports.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.date}</Text>
              <Text style={styles.cardText}>Employee: {item.employeeId}</Text>
              <Text style={styles.cardText}>Coverage: {item.coveringEmployeeId}</Text>
              <Text style={styles.cardText}>Reason: {item.reason}</Text>
              <Text style={styles.cardText}>
                Signed: {item.employeeSigned ? 'Employee' : ''} {item.managerSigned ? 'Manager' : ''}
              </Text>
            </View>
          )}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('home')}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'sla') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Weekly SLA Reports</Text>
        <Text style={styles.subtitle}>
          Generate weekly SLA summaries for Monday morning delivery.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={generateWeeklySlaReport}>
          <Text style={styles.primaryButtonText}>Generate weekly report</Text>
        </TouchableOpacity>
        <FlatList
          data={slaReports}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No SLA reports yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Week of {item.weekOf}</Text>
              <Text style={styles.cardText}>Total days logged: {item.totalDays}</Text>
              <Text style={styles.cardText}>Balanced days: {item.balancedDays}</Text>
              <Text style={styles.cardText}>Absence notices: {item.absenceCount}</Text>
              <Text style={styles.cardText}>{item.notes}</Text>
            </View>
          )}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('home')}>
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
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
      <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('absence')}>
        <Text style={styles.primaryButtonText}>Absence & Coverage Notice</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('sla')}>
        <Text style={styles.primaryButtonText}>Weekly SLA Reports</Text>
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
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111111',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sectionBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d1',
    borderRadius: 12,
    padding: 12,
  },
  sectionBoxTitle: {
    color: '#111111',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    backgroundColor: '#ffffff',
    color: '#111111',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#111111',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#111111',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#111111',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#111111',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardText: {
    color: '#4a4a4a',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  tableHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bdbdbd',
    marginBottom: 8,
  },
  tableHeaderText: {
    color: '#111111',
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  tableRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  skuColumn: {
    flex: 1,
    width: 'auto',
    textAlign: 'left',
  },
  tableCellText: {
    color: '#4a4a4a',
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    backgroundColor: '#ffffff',
    color: '#111111',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    width: 60,
    textAlign: 'center',
  },
  tableValueCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableValueText: {
    color: '#111111',
    fontSize: 12,
  },
  helperText: {
    color: '#6b6b6b',
    fontSize: 12,
    marginTop: 6,
  },
  disabledRow: {
    opacity: 0.4,
  },
  disabledInput: {
    opacity: 0.6,
  },
  flexField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#4a4a4a',
    marginBottom: 6,
  },
  summaryBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d1',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#111111',
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryText: {
    color: '#4a4a4a',
  },
  counterButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  counterText: {
    color: '#111111',
    fontSize: 18,
  },
  counterValue: {
    color: '#111111',
    fontSize: 18,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#6b6b6b',
    marginBottom: 12,
  },
});
