import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { argon2id } from '@noble/hashes/argon2';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import CryptoJS from 'crypto-js';

const db = SQLite.openDatabase('journal.db');

function utf8ToBytes(str) {
  return new Uint8Array([...str].map(c => c.charCodeAt(0)));
}

async function deriveKey(password) {
  let salt = await SecureStore.getItemAsync('salt');
  if (!salt) {
    const newSalt = bytesToHex(randomBytes(16));
    await SecureStore.setItemAsync('salt', newSalt);
    salt = newSalt;
  }
  return argon2id({
    pwd: utf8ToBytes(password),
    salt: hexToBytes(salt),
    t: 3,
    m: 1 << 16,
    p: 4,
    dkLen: 32,
  });
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [key, setKey] = useState(null);
  const [entry, setEntry] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT);');
    });
  }, []);

  useEffect(() => {
    LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock journal' })
      .then(result => {
        setAuthenticated(result.success);
        if (!result.success) Alert.alert('Authentication failed');
      });
  }, []);

  useEffect(() => {
    if (passphrase) {
      deriveKey(passphrase).then(setKey);
    }
  }, [passphrase]);

  const saveEntry = async () => {
    if (!key) {
      Alert.alert('Enter passphrase');
      return;
    }
    const cipher = CryptoJS.AES.encrypt(entry, CryptoJS.enc.Hex.parse(bytesToHex(key))).toString();
    db.transaction(tx => {
      tx.executeSql('INSERT INTO entries (content) values (?)', [cipher], () => {
        setEntry('');
        loadEntries();
      });
    });
  };

  const loadEntries = () => {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM entries', [], (_, { rows }) => {
        const items = [];
        for (let i = 0; i < rows.length; i++) {
          items.push(rows.item(i));
        }
        setEntries(items);
      });
    });
  };

  const renderItem = ({ item }) => {
    let text = 'Unable to decrypt';
    if (key) {
      try {
        const decrypted = CryptoJS.AES.decrypt(item.content, CryptoJS.enc.Hex.parse(bytesToHex(key))).toString(CryptoJS.enc.Utf8);
        text = decrypted;
      } catch (e) {
        // ignore
      }
    }
    return <Text style={styles.entry}>{text}</Text>;
  };

  if (!authenticated) {
    return (
      <View style={styles.container}>
        <Text>Authenticating...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Passphrase"
        secureTextEntry
        value={passphrase}
        onChangeText={setPassphrase}
        style={styles.input}
      />
      <TextInput
        placeholder="Write your thoughts..."
        value={entry}
        onChangeText={setEntry}
        style={[styles.input, { height: 100 }]}
        multiline
      />
      <Button title="Save" onPress={saveEntry} />
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 8,
  },
  entry: {
    marginBottom: 10,
  },
});
