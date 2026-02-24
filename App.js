import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'approved_client_pi_workspace_v1';

const suspiciousKeywords = [
  'threat',
  'fraud',
  'wire',
  'weapon',
  'bribe',
  'coercion',
  'burner',
  'crypto',
];

const fileTypeWeights = {
  image: 2,
  video: 3,
  document: 2,
  'text message': 4,
  other: 1,
};

const defaultCase = {
  clientName: '',
  caseId: '',
  authorizationReference: '',
  objective: '',
  evidence: [],
};

const newEvidence = {
  type: 'document',
  source: '',
  notes: '',
};

export default function App() {
  const [caseInfo, setCaseInfo] = useState(defaultCase);
  const [draftEvidence, setDraftEvidence] = useState(newEvidence);
  const [complianceAck, setComplianceAck] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const saved = await SecureStore.getItemAsync(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCaseInfo(parsed.caseInfo ?? defaultCase);
        setComplianceAck(Boolean(parsed.complianceAck));
      }
      setLoaded(true);
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({ caseInfo, complianceAck })
    );
  }, [loaded, caseInfo, complianceAck]);

  const analysis = useMemo(() => {
    const findings = caseInfo.evidence.map((entry) => {
      const lower = `${entry.source} ${entry.notes}`.toLowerCase();
      const matchedKeywords = suspiciousKeywords.filter((word) => lower.includes(word));
      const baseWeight = fileTypeWeights[entry.type] ?? fileTypeWeights.other;
      const score = Math.min(100, baseWeight * 10 + matchedKeywords.length * 15);
      return {
        ...entry,
        matchedKeywords,
        score,
      };
    });

    const avgRisk = findings.length
      ? Math.round(findings.reduce((sum, entry) => sum + entry.score, 0) / findings.length)
      : 0;

    return {
      findings,
      avgRisk,
      priority:
        avgRisk >= 70 ? 'High priority review' : avgRisk >= 40 ? 'Moderate review' : 'Low urgency',
    };
  }, [caseInfo.evidence]);

  const addEvidence = () => {
    if (!draftEvidence.source.trim()) {
      Alert.alert('Missing source', 'Add a filename, location, or device identifier.');
      return;
    }

    const entry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...draftEvidence,
    };

    setCaseInfo((prev) => ({ ...prev, evidence: [entry, ...prev.evidence] }));
    setDraftEvidence(newEvidence);
  };

  const clearWorkspace = () => {
    setCaseInfo(defaultCase);
    setDraftEvidence(newEvidence);
    setComplianceAck(false);
    Alert.alert('Workspace reset', 'All local case metadata has been cleared.');
  };

  const generateSummary = () => {
    if (!complianceAck) {
      Alert.alert('Compliance required', 'Confirm client authorization before generating analysis.');
      return;
    }

    Alert.alert(
      'Case Summary Ready',
      `Case ${caseInfo.caseId || '(unassigned)'} for ${caseInfo.clientName || 'unknown client'}\nRisk: ${analysis.avgRisk}/100 (${analysis.priority})\nEvidence items: ${caseInfo.evidence.length}`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Approved Client Investigation Assistant</Text>
      <Text style={styles.subtitle}>
        AI-assisted triage for files, photos, and message logs with explicit authorization controls.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1) Case Authorization Intake</Text>
        <TextInput
          style={styles.input}
          placeholder="Client name"
          value={caseInfo.clientName}
          onChangeText={(value) => setCaseInfo((prev) => ({ ...prev, clientName: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Case ID"
          value={caseInfo.caseId}
          onChangeText={(value) => setCaseInfo((prev) => ({ ...prev, caseId: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Authorization reference / warrant / consent ID"
          value={caseInfo.authorizationReference}
          onChangeText={(value) =>
            setCaseInfo((prev) => ({ ...prev, authorizationReference: value }))
          }
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Investigation objective"
          multiline
          value={caseInfo.objective}
          onChangeText={(value) => setCaseInfo((prev) => ({ ...prev, objective: value }))}
        />
        <TouchableOpacity
          style={complianceAck ? styles.primaryButton : styles.secondaryButton}
          onPress={() => setComplianceAck((prev) => !prev)}
        >
          <Text style={complianceAck ? styles.primaryText : styles.secondaryText}>
            {complianceAck ? 'Authorization Confirmed' : 'Tap to confirm client authorization'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2) Evidence Intake</Text>
        <View style={styles.row}>
          {['image', 'video', 'document', 'text message', 'other'].map((type) => (
            <TouchableOpacity
              key={type}
              style={draftEvidence.type === type ? styles.tagActive : styles.tag}
              onPress={() => setDraftEvidence((prev) => ({ ...prev, type }))}
            >
              <Text style={draftEvidence.type === type ? styles.tagTextActive : styles.tagText}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Source (file name, chat export, device path)"
          value={draftEvidence.source}
          onChangeText={(value) => setDraftEvidence((prev) => ({ ...prev, source: value }))}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Notes / extracted text / investigator observations"
          multiline
          value={draftEvidence.notes}
          onChangeText={(value) => setDraftEvidence((prev) => ({ ...prev, notes: value }))}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={addEvidence}>
          <Text style={styles.primaryText}>Add Evidence Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3) AI Analysis Output</Text>
        <Text style={styles.metric}>Overall risk score: {analysis.avgRisk}/100</Text>
        <Text style={styles.metric}>Review level: {analysis.priority}</Text>

        {analysis.findings.map((entry) => (
          <View key={entry.id} style={styles.finding}>
            <Text style={styles.findingTitle}>{entry.type.toUpperCase()} • {entry.source}</Text>
            <Text style={styles.findingText}>Score: {entry.score}/100</Text>
            <Text style={styles.findingText}>
              Keywords: {entry.matchedKeywords.length ? entry.matchedKeywords.join(', ') : 'none'}
            </Text>
          </View>
        ))}

        {analysis.findings.length === 0 && (
          <Text style={styles.emptyState}>No evidence added yet.</Text>
        )}

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.primaryButton} onPress={generateSummary}>
            <Text style={styles.primaryText}>Generate Case Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={clearWorkspace}>
            <Text style={styles.secondaryText}>Clear Local Workspace</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#cbd5e1', marginBottom: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  input: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  multiline: { minHeight: 74, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryText: { color: '#eff6ff', fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    borderColor: '#94a3b8',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  secondaryText: { color: '#cbd5e1', textAlign: 'center', fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  tag: {
    borderColor: '#64748b',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagActive: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: { color: '#cbd5e1', fontSize: 12 },
  tagTextActive: { color: '#eff6ff', fontSize: 12, fontWeight: '700' },
  metric: { color: '#e2e8f0', marginBottom: 4 },
  finding: {
    backgroundColor: '#334155',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  findingTitle: { color: '#f1f5f9', fontWeight: '700', marginBottom: 4 },
  findingText: { color: '#cbd5e1' },
  emptyState: { color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
});
